import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY:     ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const PatchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]),
});

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
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { status: newStatus } = parsed.data;

    // Obtener la orden y verificar que pertenece al tenant del usuario
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, tenantId: true, status: true, orderNumber: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    // Verificar acceso del usuario a este tenant
    await assertTenantAccess(session.user.id, order.tenantId);

    // Validar que la transición de estado sea válida
    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `No se puede pasar de ${order.status} a ${newStatus}.` },
        { status: 422 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, status: true, orderNumber: true },
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[orders/PATCH]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
