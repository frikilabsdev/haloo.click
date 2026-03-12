import type { CartItem } from "@/types";
import { formatCurrency } from "./utils";

interface WhatsAppMessageData {
  template: string;        // whatsappMessageTemplate del tenant
  items: CartItem[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  customerName: string;
  address: string;         // "Recoger en local" si es PICKUP
  paymentMethod: string;   // label legible
  deliveryType: "DELIVERY" | "PICKUP";
  costPending?: boolean;   // true cuando el restaurante confirmará el costo después
  notes?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia bancaria",
  CARD:     "Tarjeta (en puerta)",
};

/**
 * Formatea la lista de items para el mensaje de WhatsApp.
 * Ejemplo:
 *   • 2x Tacos al Pastor — Verde (suave), Doble carne   $88.00
 *   • 1x Torta Cubana — Grande, Sin cebolla             $105.00
 */
function formatItems(items: CartItem[]): string {
  return items
    .map(item => {
      const opts = item.selectedOptions.length
        ? ` — ${item.selectedOptions.map(o => o.optionName).join(", ")}`
        : "";
      const price = formatCurrency(item.total);
      const line = `• ${item.quantity}x ${item.productName}${opts}   ${price}`;
      return item.notes ? `${line}\n  📝 ${item.notes}` : line;
    })
    .join("\n");
}

/**
 * Construye el mensaje de WhatsApp usando el template del tenant.
 * Variables disponibles: {items}, {subtotal}, {delivery}, {total}, {name}, {address}, {payment}, {notes}
 * {delivery} muestra: tipo + costo o "a confirmar" según el modo de entrega
 */
export function buildWhatsAppMessage(data: WhatsAppMessageData): string {
  const { template, items, subtotal, deliveryCost, total, customerName, address, paymentMethod, deliveryType, costPending, notes } = data;

  const itemsText = formatItems(items);
  const deliveryLabel =
    deliveryType === "PICKUP"
      ? "Entrega: Recoger en local"
      : costPending
        ? "Envío: El restaurante confirmará el costo al contactarte"
        : deliveryCost > 0
          ? `Envío: ${formatCurrency(deliveryCost)}`
          : "Envío: Sin cargo";

  let msg = template
    .replace("{items}",    itemsText)
    .replace("{subtotal}", formatCurrency(subtotal))
    .replace("{delivery}", deliveryLabel)
    .replace("{total}",    formatCurrency(total))
    .replace("{name}",     customerName)
    .replace("{address}",  address)
    .replace("{payment}",  PAYMENT_LABELS[paymentMethod] ?? paymentMethod);

  if (notes) {
    msg += `\n\nNotas: ${notes}`;
  }

  return msg;
}

/**
 * Genera la URL de WhatsApp para abrir la conversación con el mensaje pre-llenado.
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  // Limpiar el número: quitar espacios, guiones, paréntesis
  const clean = phoneNumber.replace(/[\s\-().]/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encoded}`;
}
