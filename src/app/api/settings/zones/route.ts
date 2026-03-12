import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

const CreateZoneSchema = z.object({
  name:     z.string().min(1).max(80),
  cost:     z.number().min(0),
  isFree:   z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ── GET /api/settings/zones — todas las zonas (admin) ────────────────────────

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

    const zones = await prisma.deliveryZone.findMany({
      where:   { tenantId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: zones });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/zones GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── POST /api/settings/zones ──────────────────────────────────────────────────

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
    const parsed = CreateZoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        tenantId,
        name:     parsed.data.name,
        cost:     parsed.data.cost,
        isFree:   parsed.data.isFree ?? false,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json({ data: zone }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/zones POST]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
