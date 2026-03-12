import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

// ── GET /api/public/orders/[orderId] — Tracking público (sin auth) ────────────
// Usa trackingToken (UUID aleatorio) en lugar del ID de la orden para evitar
// enumeración de pedidos.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // ── Rate limiting: 30 consultas por IP por minuto ──────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit(`track:${ip}`, 30, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas consultas. Espera un momento." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { trackingToken: orderId },
      select: {
        trackingToken: true,
        orderNumber:   true,
        status:        true,
        customerName:  true,
        deliveryType:  true,
        createdAt:     true,
        updatedAt:     true,
        tenant: {
          select: {
            name:           true,
            slug:           true,
            whatsappNumber: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[public/orders GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
