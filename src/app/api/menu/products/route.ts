import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

// ── Esquema ───────────────────────────────────────────────────────────────────

const CreateProductSchema = z.object({
  categoryId:  z.string().min(1, "La categoría es requerida"),
  name:        z.string().min(1, "El nombre es requerido").max(120),
  description: z.string().max(500).optional(),
  basePrice:   z.number().nonnegative("El precio no puede ser negativo"),
  isActive:    z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

// ── POST /api/menu/products ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Sin restaurante asociado." }, { status: 403 });
    }

    await assertTenantAccess(session.user.id, tenantId);

    const body = await request.json();
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verificar que la categoría pertenece al tenant
    const category = await prisma.category.findUnique({
      where:  { id: parsed.data.categoryId },
      select: { tenantId: true },
    });
    if (!category || category.tenantId !== tenantId) {
      return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    // Calcular siguiente posición dentro de la categoría
    const lastProduct = await prisma.product.findFirst({
      where:   { tenantId, categoryId: parsed.data.categoryId },
      orderBy: { position: "desc" },
      select:  { position: true },
    });
    const position = (lastProduct?.position ?? -1) + 1;

    const product = await prisma.product.create({
      data: {
        tenantId,
        categoryId:  parsed.data.categoryId,
        name:        parsed.data.name,
        description: parsed.data.description ?? null,
        basePrice:   new Prisma.Decimal(parsed.data.basePrice),
        isActive:    parsed.data.isActive ?? true,
        isAvailable: parsed.data.isAvailable ?? true,
        position,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/products POST]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
