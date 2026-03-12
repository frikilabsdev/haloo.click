import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

// ── GET /api/menu/products/[id]/suggestions ───────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Sin restaurante." }, { status: 403 });
    await assertTenantAccess(session.user.id, tenantId);

    const { id: productId } = await params;

    const suggestions = await prisma.productSuggestion.findMany({
      where: { productId },
      orderBy: { position: "asc" },
      select: {
        id:       true,
        position: true,
        suggestedProduct: {
          select: {
            id:        true,
            name:      true,
            basePrice: true,
            isActive:  true,
            images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
            variants: { select: { id: true, name: true, price: true }, orderBy: { position: "asc" }, take: 1 },
          },
        },
      },
    });

    return NextResponse.json({ data: JSON.parse(JSON.stringify(suggestions)) });
  } catch (e) {
    console.error("[suggestions GET]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// ── POST /api/menu/products/[id]/suggestions ──────────────────────────────────

const AddSchema = z.object({ suggestedProductId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Sin restaurante." }, { status: 403 });
    await assertTenantAccess(session.user.id, tenantId);

    const { id: productId } = await params;
    const parsed = AddSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { suggestedProductId } = parsed.data;

    // Evitar auto-referencia
    if (productId === suggestedProductId) {
      return NextResponse.json({ error: "Un producto no puede sugerirse a sí mismo." }, { status: 400 });
    }

    // Verificar que ambos productos pertenecen al tenant
    const [product, suggested] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId },          select: { tenantId: true } }),
      prisma.product.findUnique({ where: { id: suggestedProductId }, select: { tenantId: true } }),
    ]);
    if (!product || product.tenantId !== tenantId) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    if (!suggested || suggested.tenantId !== tenantId) {
      return NextResponse.json({ error: "Producto sugerido no encontrado." }, { status: 404 });
    }

    // Calcular posición
    const last = await prisma.productSuggestion.findFirst({
      where: { productId }, orderBy: { position: "desc" }, select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    const row = await prisma.productSuggestion.create({
      data: { productId, suggestedProductId, position },
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Ya está en la lista de sugerencias." }, { status: 409 });
    }
    console.error("[suggestions POST]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// ── DELETE /api/menu/products/[id]/suggestions?suggestionId=... ───────────────

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const tenantId = session.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Sin restaurante." }, { status: 403 });
    await assertTenantAccess(session.user.id, tenantId);

    const { id: productId } = await params;
    const suggestionId = req.nextUrl.searchParams.get("suggestionId");
    if (!suggestionId) return NextResponse.json({ error: "suggestionId requerido." }, { status: 400 });

    // Verificar que la sugerencia pertenece al producto del tenant
    const row = await prisma.productSuggestion.findUnique({
      where: { id: suggestionId },
      select: { productId: true, product: { select: { tenantId: true } } },
    });
    if (!row || row.productId !== productId || row.product.tenantId !== tenantId) {
      return NextResponse.json({ error: "Sugerencia no encontrada." }, { status: 404 });
    }

    await prisma.productSuggestion.delete({ where: { id: suggestionId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error("[suggestions DELETE]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
