import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

// ── Esquemas ──────────────────────────────────────────────────────────────────

const CreateCategorySchema = z.object({
  name:        z.string().min(1, "El nombre es requerido").max(80),
  description: z.string().max(300).optional(),
});

// ── GET /api/menu/categories ──────────────────────────────────────────────────

export async function GET() {
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

    const categories = await prisma.category.findMany({
      where:   { tenantId },
      orderBy: { position: "asc" },
      include: {
        products: {
          orderBy: { position: "asc" },
          select: {
            id:          true,
            name:        true,
            basePrice:   true,
            isActive:    true,
            isAvailable: true,
            images:      { take: 1, orderBy: { position: "asc" }, select: { url: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/categories GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── POST /api/menu/categories ─────────────────────────────────────────────────

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
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Calcular la siguiente posición
    const lastCategory = await prisma.category.findFirst({
      where:   { tenantId },
      orderBy: { position: "desc" },
      select:  { position: true },
    });
    const position = (lastCategory?.position ?? -1) + 1;

    const category = await prisma.category.create({
      data: {
        tenantId,
        name:        parsed.data.name,
        description: parsed.data.description ?? null,
        position,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/categories POST]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
