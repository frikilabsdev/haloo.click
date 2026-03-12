import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

const PatchVariantSchema = z.object({
  name:        z.string().min(1).max(80).optional(),
  price:       z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
  position:    z.number().int().min(0).optional(),
});

async function resolveVariant(variantId: string, userId: string) {
  const variant = await prisma.productVariant.findUnique({
    where:  { id: variantId },
    include: { product: { select: { tenantId: true } } },
  });
  if (!variant) return null;
  await assertTenantAccess(userId, variant.product.tenantId);
  return variant;
}

// ── PATCH /api/menu/variants/[variantId] ──────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { variantId } = await params;
    const variant = await resolveVariant(variantId, session.user.id);
    if (!variant) return NextResponse.json({ error: "Variante no encontrada." }, { status: 404 });

    const body = await request.json();
    const parsed = PatchVariantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data:  parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[variants PATCH]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// ── DELETE /api/menu/variants/[variantId] ─────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { variantId } = await params;
    const variant = await resolveVariant(variantId, session.user.id);
    if (!variant) return NextResponse.json({ error: "Variante no encontrada." }, { status: 404 });

    await prisma.productVariant.delete({ where: { id: variantId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[variants DELETE]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
