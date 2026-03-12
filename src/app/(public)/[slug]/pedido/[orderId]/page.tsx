import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCurrency } from "@/lib/utils";
import { TrackingClient } from "./_components/TrackingClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; orderId: string }>;
}

export default async function TrackingPage({ params }: Props) {
  const { slug, orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { trackingToken: orderId },
    select: {
      id:           true,
      orderNumber:  true,
      status:       true,
      customerName: true,
      deliveryType: true,
      address:      true,
      paymentMethod: true,
      subtotal:     true,
      deliveryCost: true,
      total:        true,
      notes:        true,
      items: {
        select: {
          productName:     true,
          quantity:        true,
          total:           true,
          selectedOptions: true,
          notes:           true,
        },
      },
      tenant: {
        select: {
          slug:                    true,
          whatsappNumber:          true,
          whatsappMessageTemplate: true,
        },
      },
    },
  });

  if (!order || order.tenant.slug !== slug) notFound();

  // Construir URL de WhatsApp server-side sin depender del tipo CartItem
  let whatsappUrl: string | null = null;
  if (order.tenant.whatsappNumber) {
    const PAYMENT: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia bancaria", CARD: "Tarjeta (en puerta)" };

    const itemLines = order.items.map(item => {
      const opts = (item.selectedOptions as Array<{ optionName: string }> ?? [])
        .map(o => o.optionName).join(", ");
      const line = `• ${item.quantity}x ${item.productName}${opts ? ` — ${opts}` : ""}   ${formatCurrency(Number(item.total))}`;
      return item.notes ? `${line}\n  📝 ${item.notes}` : line;
    }).join("\n");

    const deliveryCost = Number(order.deliveryCost ?? 0);
    const address      = order.address ?? (order.deliveryType === "PICKUP" ? "Recoger en local" : "");
    const deliveryLine = deliveryCost > 0 ? `Envío: ${formatCurrency(deliveryCost)}` : "Recoger en local";

    const template = order.tenant.whatsappMessageTemplate
      ?? "Hola! Quiero hacer un pedido:\n{items}\n\nSubtotal: {subtotal}\n{delivery}\nTotal: {total}\n\nDatos de entrega:\nNombre: {name}\nDirección: {address}\nPago: {payment}";

    let msg = template
      .replace("{items}",    itemLines)
      .replace("{subtotal}", formatCurrency(Number(order.subtotal)))
      .replace("{delivery}", deliveryLine)
      .replace("{total}",    formatCurrency(Number(order.total)))
      .replace("{name}",     order.customerName)
      .replace("{address}",  address)
      .replace("{payment}",  PAYMENT[order.paymentMethod] ?? order.paymentMethod);

    if (order.notes) msg += `\n\nNotas: ${order.notes}`;

    whatsappUrl = buildWhatsAppUrl(order.tenant.whatsappNumber, msg);
  }

  return (
    <TrackingClient
      orderId={orderId}
      slug={slug}
      whatsappUrl={whatsappUrl}
    />
  );
}
