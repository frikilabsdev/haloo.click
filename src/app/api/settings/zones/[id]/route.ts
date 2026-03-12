import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

const PatchZoneSchema = z.object({
  name:     z.string().min(1).max(80).optional(),
  cost:     z.number().min(0).optional(),
  isFree:   z.boolean().optional(),
  isActive: z.boolean().optional(),
});

async function resolveAccess(zoneId: string, userId: string) {
  const zone = await prisma.deliveryZone.findUnique({
    where:  { id: zoneId },
    select: { tenantId: true },
  });
  if (!zone) return null;
  await assertTenantAccess(userId, zone.tenantId);
  return zone;
}

// ── PATCH /api/settings/zones/[id] ───────────────────────────────────────────

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
    const zone = await resolveAccess(id, session.user.id);
    if (!zone) {
      return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = PatchZoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.deliveryZone.update({
      where: { id },
      data:  parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/zones/[id] PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── DELETE /api/settings/zones/[id] ──────────────────────────────────────────

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
    const zone = await resolveAccess(id, session.user.id);
    if (!zone) {
      return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
    }

    await prisma.deliveryZone.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/zones/[id] DELETE]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
