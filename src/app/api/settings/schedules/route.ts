import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

const ScheduleRowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime:  z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  isActive:  z.boolean(),
});

const PutSchedulesSchema = z.array(ScheduleRowSchema).length(7);

// ── GET /api/settings/schedules ───────────────────────────────────────────────

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

    const schedules = await prisma.schedule.findMany({
      where:   { tenantId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ data: schedules });
  } catch (error) {
    console.error("[settings/schedules GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── PUT /api/settings/schedules — reemplaza los 7 horarios ───────────────────

export async function PUT(request: NextRequest) {
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
    const parsed = PutSchedulesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Upsert los 7 días
    await prisma.$transaction(
      parsed.data.map(row =>
        prisma.schedule.upsert({
          where:  { tenantId_dayOfWeek: { tenantId, dayOfWeek: row.dayOfWeek } },
          update: { openTime: row.openTime, closeTime: row.closeTime, isActive: row.isActive },
          create: { tenantId, dayOfWeek: row.dayOfWeek, openTime: row.openTime, closeTime: row.closeTime, isActive: row.isActive },
        })
      )
    );

    const updated = await prisma.schedule.findMany({
      where:   { tenantId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/schedules PUT]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
