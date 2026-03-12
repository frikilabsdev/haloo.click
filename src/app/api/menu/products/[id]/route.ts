import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

// ── Esquema ───────────────────────────────────────────────────────────────────

const PatchProductSchema = z.object({
  name:        z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  basePrice:   z.number().nonnegative().optional(),
  categoryId:  z.string().optional(),
  isActive:    z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  imageUrl:    z.string().min(1).nullable().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveAccess(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { tenantId: true },
  });
  if (!product) return null;
  await assertTenantAccess(userId, product.tenantId);
  return product;
}

// ── GET /api/menu/products/[id] ───────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const access = await resolveAccess(id, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const raw = await prisma.product.findUnique({
      where:   { id },
      include: {
        images:   { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
        complements: {
          orderBy: { position: "asc" },
          include: {
            optionGroup: { include: { options: { orderBy: { position: "asc" } } } },
          },
        },
      },
    });

    if (!raw) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });

    const product = {
      ...raw,
      optionGroups: raw.complements.map(c => c.optionGroup),
      complements:  undefined,
    };

    return NextResponse.json({ data: product });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/products/[id] GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── PATCH /api/menu/products/[id] ─────────────────────────────────────────────

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
    const access = await resolveAccess(id, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { imageUrl, basePrice, ...rest } = parsed.data;

    // Si se envía imageUrl, upsert en ProductImage (posición 0)
    if (imageUrl !== undefined) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (imageUrl === null) {
          // Eliminar imagen principal
          await tx.productImage.deleteMany({
            where: { productId: id, position: 0 },
          });
        } else {
          const existing = await tx.productImage.findFirst({
            where: { productId: id, position: 0 },
          });
          if (existing) {
            await tx.productImage.update({
              where: { id: existing.id },
              data:  { url: imageUrl },
            });
          } else {
            await tx.productImage.create({
              data: { productId: id, url: imageUrl, position: 0 },
            });
          }
        }
      });
    }

    const updateData: Prisma.ProductUpdateInput = { ...rest };
    if (basePrice !== undefined) {
      updateData.basePrice = new Prisma.Decimal(basePrice);
    }

    const rawUpdated = await prisma.product.update({
      where:   { id },
      data:    updateData,
      include: {
        images:   { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
        complements: {
          orderBy: { position: "asc" },
          include: { optionGroup: { include: { options: { orderBy: { position: "asc" } } } } },
        },
      },
    });

    const updated = {
      ...rawUpdated,
      optionGroups: rawUpdated.complements.map(c => c.optionGroup),
      complements:  undefined,
    };

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/products/[id] PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── DELETE /api/menu/products/[id] ────────────────────────────────────────────

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
    const access = await resolveAccess(id, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/products/[id] DELETE]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
