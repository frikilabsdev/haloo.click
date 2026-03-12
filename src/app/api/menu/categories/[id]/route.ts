import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

// ── Esquema ───────────────────────────────────────────────────────────────────

const PatchCategorySchema = z.object({
  name:        z.string().min(1).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  isActive:    z.boolean().optional(),
  position:    z.number().int().min(0).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveAccess(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where:  { id: categoryId },
    select: { tenantId: true },
  });
  if (!category) return null;
  await assertTenantAccess(userId, category.tenantId);
  return category;
}

// ── PATCH /api/menu/categories/[id] ──────────────────────────────────────────

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
    const category = await resolveAccess(id, session.user.id);
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.category.update({
      where: { id },
      data:  parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/categories/[id] PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── DELETE /api/menu/categories/[id] ─────────────────────────────────────────

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
    const category = await resolveAccess(id, session.user.id);
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/categories/[id] DELETE]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
