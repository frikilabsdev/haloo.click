import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";
import { validateOrigin } from "@/lib/csrf";

const PatchPaymentSchema = z.object({
  cashEnabled:     z.boolean().optional(),
  transferEnabled: z.boolean().optional(),
  cardEnabled:     z.boolean().optional(),
  bankName:        z.string().max(80).nullable().optional(),
  clabe:           z.string().max(30).nullable().optional(),
  accountNumber:   z.string().max(30).nullable().optional(),
  accountHolder:   z.string().max(100).nullable().optional(),
  reference:       z.string().max(100).nullable().optional(),
});

// ── GET /api/settings/payment ─────────────────────────────────────────────────

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

    const config = await prisma.paymentConfig.findUnique({ where: { tenantId } });
    return NextResponse.json({ data: config });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/payment GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── PATCH /api/settings/payment ───────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
    }

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
    const parsed = PatchPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.paymentConfig.upsert({
      where:  { tenantId },
      update: parsed.data,
      create: { tenantId, ...parsed.data },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/payment PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
