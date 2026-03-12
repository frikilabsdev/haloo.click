import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

// ── Esquema ───────────────────────────────────────────────────────────────────

const PatchOptionSchema = z.object({
  name:        z.string().min(1).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  price:       z.number().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveAccess(optionId: string, userId: string) {
  const option = await prisma.option.findUnique({
    where:   { id: optionId },
    include: { optionGroup: { select: { tenantId: true } } },
  });
  if (!option) return null;
  await assertTenantAccess(userId, option.optionGroup.tenantId);
  return option;
}

// ── PATCH /api/menu/options/[id] ──────────────────────────────────────────────

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
    const option = await resolveAccess(id, session.user.id);
    if (!option) {
      return NextResponse.json({ error: "Opción no encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchOptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { price, ...rest } = parsed.data;
    const updateData: Prisma.OptionUpdateInput = { ...rest };
    if (price !== undefined) {
      updateData.price = new Prisma.Decimal(price);
    }

    const updated = await prisma.option.update({
      where: { id },
      data:  updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/options/[id] PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── DELETE /api/menu/options/[id] ─────────────────────────────────────────────

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
    const option = await resolveAccess(id, session.user.id);
    if (!option) {
      return NextResponse.json({ error: "Opción no encontrada." }, { status: 404 });
    }

    await prisma.option.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/options/[id] DELETE]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
