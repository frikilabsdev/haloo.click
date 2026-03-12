import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveProduct(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { tenantId: true },
  });
  if (!product) return null;
  await assertTenantAccess(userId, product.tenantId);
  return product;
}

// ── GET /api/menu/complements/[productId] ─────────────────────────────────────
// Lista los grupos asignados a un producto, ordenados por position

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { productId } = await params;
    const product = await resolveProduct(productId, session.user.id);
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const complements = await prisma.productComplement.findMany({
      where:   { productId },
      orderBy: { position: "asc" },
      include: {
        optionGroup: {
          include: { options: { orderBy: { position: "asc" } } },
        },
      },
    });

    // Aplanar a OptionGroup[] para mantener interfaz compatible
    const optionGroups = complements.map(c => c.optionGroup);
    return NextResponse.json({ data: optionGroups });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/complements/[productId] GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── POST /api/menu/complements/[productId] ────────────────────────────────────
// Asigna un grupo existente a un producto

const AssignSchema = z.object({
  optionGroupId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { productId } = await params;
    const product = await resolveProduct(productId, session.user.id);
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = AssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Verificar que el grupo pertenece al mismo tenant
    const group = await prisma.optionGroup.findUnique({
      where:  { id: parsed.data.optionGroupId },
      select: { tenantId: true, isVariant: true },
    });
    if (!group || group.tenantId !== product.tenantId) {
      return NextResponse.json({ error: "Complemento no encontrado." }, { status: 404 });
    }

    // Fix #4: evitar coexistencia de isVariant OptionGroup + ProductVariant
    if (group.isVariant) {
      const hasProductVariants = await prisma.productVariant.count({ where: { productId } });
      if (hasProductVariants > 0) {
        return NextResponse.json(
          { error: "Este producto ya usa variantes directas. No puedes asignar un grupo de tipo variante." },
          { status: 409 }
        );
      }
      const hasIsVariantGroup = await prisma.productComplement.count({
        where: {
          productId,
          optionGroup: { isVariant: true },
        },
      });
      if (hasIsVariantGroup > 0) {
        return NextResponse.json(
          { error: "Este producto ya tiene un grupo de variantes asignado." },
          { status: 409 }
        );
      }
    }

    // Calcular posición
    const last = await prisma.productComplement.findFirst({
      where:   { productId },
      orderBy: { position: "desc" },
      select:  { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    const complement = await prisma.productComplement.create({
      data: { productId, optionGroupId: parsed.data.optionGroupId, position },
      include: {
        optionGroup: { include: { options: { orderBy: { position: "asc" } } } },
      },
    });

    return NextResponse.json({ data: complement.optionGroup }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    // Unique constraint = ya estaba asignado
    if (error instanceof Error && error.message.includes("Unique")) {
      return NextResponse.json({ error: "Este complemento ya está asignado al producto." }, { status: 409 });
    }
    console.error("[menu/complements/[productId] POST]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── DELETE /api/menu/complements/[productId]?groupId=... ──────────────────────
// Desasigna un grupo de un producto

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { productId } = await params;
    const product = await resolveProduct(productId, session.user.id);
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const optionGroupId = searchParams.get("groupId");
    if (!optionGroupId) {
      return NextResponse.json({ error: "groupId requerido." }, { status: 400 });
    }

    await prisma.productComplement.deleteMany({
      where: { productId, optionGroupId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/complements/[productId] DELETE]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
