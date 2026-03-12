import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

// ── Esquema ───────────────────────────────────────────────────────────────────

const PatchGroupSchema = z.object({
  name:           z.string().min(1).max(80).optional(),
  internalName:   z.string().max(120).nullable().optional(),
  description:    z.string().max(500).nullable().optional(),
  isVariant:      z.boolean().optional(),
  required:       z.boolean().optional(),
  multiple:       z.boolean().optional(),
  min:            z.number().int().min(0).optional(),
  max:            z.number().int().min(1).nullable().optional(),
  showIfOptionId: z.string().nullable().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveAccess(groupId: string, userId: string) {
  const group = await prisma.optionGroup.findUnique({
    where:  { id: groupId },
    select: { tenantId: true },
  });
  if (!group) return null;
  await assertTenantAccess(userId, group.tenantId);
  return group;
}

// ── PATCH /api/menu/groups/[id] ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const group = await resolveAccess(id, session.user.id);
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.optionGroup.update({
      where:   { id },
      data:    parsed.data,
      include: {
        options:     { orderBy: { position: "asc" } },
        complements: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/groups/[id] PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── DELETE /api/menu/groups/[id] ──────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const group = await resolveAccess(id, session.user.id);
    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    // Opciones y complementos se eliminan por cascade
    await prisma.optionGroup.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/groups/[id] DELETE]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
