import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";
import { validateOrigin } from "@/lib/csrf";

const PatchTenantSchema = z.object({
  name:                   z.string().min(1).max(80).optional(),
  description:            z.string().max(500).nullable().optional(),
  type:                   z.string().max(50).nullable().optional(),
  phone:                  z.string().max(30).nullable().optional(),
  whatsappNumber:         z.string().max(30).nullable().optional(),
  whatsappMessageTemplate: z.string().max(2000).nullable().optional(),
  stateId:                z.string().nullable().optional(),
  cityId:                 z.string().nullable().optional(),
  address:                z.string().max(200).nullable().optional(),
  logo:                   z.string().nullable().optional(),
  coverImage:             z.string().nullable().optional(),
  deliveryEnabled:        z.boolean().optional(),
  pickupEnabled:          z.boolean().optional(),
});

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
    const parsed = PatchTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data:  parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[settings/tenant PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
