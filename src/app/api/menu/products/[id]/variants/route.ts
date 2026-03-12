import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

const CreateVariantSchema = z.object({
  name:  z.string().min(1, "El nombre es requerido").max(80),
  price: z.number().min(0, "El precio no puede ser negativo"),
});

const PatchProductSchema = z.object({
  variantGroupName: z.string().max(80).nullable().optional(),
});

// ── Verificar acceso al producto ──────────────────────────────────────────────

async function resolveProduct(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { tenantId: true },
  });
  if (!product) return null;
  await assertTenantAccess(userId, product.tenantId);
  return product;
}

// ── GET /api/menu/products/[id]/variants ──────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { id } = await params;
    const product = await resolveProduct(id, session.user.id);
    if (!product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });

    const variants = await prisma.productVariant.findMany({
      where:   { productId: id },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ data: variants });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[variants GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// ── POST /api/menu/products/[id]/variants ─────────────────────────────────────
// También acepta { variantGroupName } para actualizar el label del grupo

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { id } = await params;
    const product = await resolveProduct(id, session.user.id);
    if (!product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });

    const body = await request.json();

    // Si solo se manda variantGroupName, actualizar el producto
    const patchParsed = PatchProductSchema.safeParse(body);
    if (patchParsed.success && "variantGroupName" in body && !("name" in body)) {
      const updated = await prisma.product.update({
        where: { id },
        data:  { variantGroupName: patchParsed.data.variantGroupName },
      });
      return NextResponse.json({ data: updated });
    }

    // Si se manda name + price, crear variante
    const parsed = CreateVariantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Fix #4: evitar coexistencia de ProductVariant + isVariant OptionGroup
    const hasIsVariantGroup = await prisma.productComplement.count({
      where: {
        productId: id,
        optionGroup: { isVariant: true },
      },
    });
    if (hasIsVariantGroup > 0) {
      return NextResponse.json(
        { error: "Este producto ya tiene un grupo de variantes asignado. Elimínalo antes de agregar variantes directas." },
        { status: 409 }
      );
    }

    const last = await prisma.productVariant.findFirst({
      where:   { productId: id },
      orderBy: { position: "desc" },
      select:  { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        name:      parsed.data.name,
        price:     parsed.data.price,
        position,
      },
    });

    return NextResponse.json({ data: variant }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[variants POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
