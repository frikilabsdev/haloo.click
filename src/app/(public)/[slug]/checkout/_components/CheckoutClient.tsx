"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { TenantWithRelations } from "@/types";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { ZoneSelect } from "./ZoneSelect";
import type { PickResult } from "./MapPicker";

const MapPicker = dynamic(
  () => import("./MapPicker").then(m => m.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 280, borderRadius: 14, background: "#f3f4f6", border: "1.5px solid var(--menu-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#9ca3af" }}>Cargando mapa…</p>
      </div>
    ),
  }
);

interface Props {
  tenant: TenantWithRelations;
}

type DeliveryType = "DELIVERY" | "PICKUP";
type PaymentMethod = "CASH" | "TRANSFER" | "CARD";

export function CheckoutClient({ tenant }: Props) {
  const router = useRouter();
  const items = useCartStore(s => s.items);
  const clearCart = useCartStore(s => s.clearCart);
  const cartTotal = useCartStore(s => s.total);

  // Computar antes de useState para poder inicializar paymentMethod correctamente
  const pc = tenant.paymentConfig;
  const paymentOptions = [
    pc?.cashEnabled     && { value: "CASH"     as PaymentMethod, label: "Efectivo",              icon: "💵" },
    pc?.transferEnabled && { value: "TRANSFER"  as PaymentMethod, label: "Transferencia bancaria", icon: "🏦" },
    pc?.cardEnabled     && { value: "CARD"      as PaymentMethod, label: "Tarjeta (en puerta)",   icon: "💳" },
  ].filter(Boolean) as Array<{ value: PaymentMethod; label: string; icon: string }>;

  const isOpen = checkIfOpen(tenant.schedules ?? []);

  const [deliveryType,    setDeliveryType]    = useState<DeliveryType>(
    (tenant.deliveryEnabled ?? true) ? "DELIVERY" : "PICKUP"
  );
  const [selectedZoneId,  setSelectedZoneId]  = useState<string>("");
  const [paymentMethod,   setPaymentMethod]   = useState<PaymentMethod>(paymentOptions[0]?.value ?? "CASH");
  const [customerName,    setCustomerName]    = useState("");
  const [customerPhone,   setCustomerPhone]   = useState("");
  const [address,         setAddress]         = useState("");
  const [addressRef,      setAddressRef]      = useState("");
  const [lat,             setLat]             = useState<number | undefined>(undefined);
  const [lng,             setLng]             = useState<number | undefined>(undefined);
  const [notes,           setNotes]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [waGate,          setWaGate]          = useState<{ url: string; orderNumber: string; orderId: string } | null>(null);

  const handleMapPick = useCallback((r: PickResult) => {
    setLat(r.lat);
    setLng(r.lng);
    setAddress(r.address);
  }, []);

  const activeZones = tenant.deliveryZones.filter(z => z.isActive);
  const pickupZone = activeZones.find(z => z.isFree);
  const deliveryZones = activeZones.filter(z => !z.isFree);

  // El restaurante elige el sistema: si tiene zonas → ZoneSelect; si no → mapa
  const useMapDelivery = deliveryZones.length === 0;

  // Opciones de entrega disponibles según configuración del restaurante
  const deliveryEnabled = tenant.deliveryEnabled ?? true;
  const pickupEnabled   = tenant.pickupEnabled   ?? true;
  const availableTypes  = (["DELIVERY", "PICKUP"] as DeliveryType[]).filter(t =>
    t === "DELIVERY" ? deliveryEnabled : pickupEnabled
  );

  const selectedZone = useMemo(
    () => activeZones.find(z => z.id === selectedZoneId) ?? null,
    [activeZones, selectedZoneId]
  );

  // zone.cost es Decimal de Prisma — tras JSON.stringify/parse llega como string o number
  const deliveryCost = deliveryType === "PICKUP" ? 0
    : useMapDelivery ? 0
    : Number(selectedZone?.cost ?? 0);
  const subtotal = cartTotal();
  const total = subtotal + deliveryCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (availableTypes.length === 0) { setError("Este restaurante no tiene modos de entrega disponibles."); return; }
    if (items.length === 0) { setError("Tu carrito está vacío."); return; }
    if (!customerName.trim()) { setError("Ingresa tu nombre."); return; }
    if (!customerPhone.trim()) { setError("Ingresa tu teléfono."); return; }
    if (deliveryType === "DELIVERY") {
      if (!useMapDelivery && !selectedZoneId) {
        setError("Selecciona una zona de entrega."); return;
      }
      if (!address.trim()) { setError("Ingresa tu dirección de entrega."); return; }
    }

    setSubmitting(true);

    const zoneId = deliveryType === "PICKUP"
      ? (pickupZone?.id ?? undefined)
      : useMapDelivery
        ? undefined
        : selectedZoneId;

    const body = {
      tenantSlug:    tenant.slug,
      customerName:  customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryType,
      address:       deliveryType === "DELIVERY" ? address.trim() : "Recoger en local",
      addressRef:    addressRef.trim() || undefined,
      lat:           deliveryType === "DELIVERY" && useMapDelivery ? lat : undefined,
      lng:           deliveryType === "DELIVERY" && useMapDelivery ? lng : undefined,
      deliveryZoneId: zoneId,
      paymentMethod,
      notes:         notes.trim() || undefined,
      items: items.map(item => ({
        productId:       item.productId,
        productName:     item.productName,
        unitPrice:       item.unitPrice,
        quantity:        item.quantity,
        selectedOptions: item.selectedOptions,
        notes:           item.notes,
        total:           item.total,
      })),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear el pedido.");
        setSubmitting(false);
        return;
      }

      const trackingToken = data.trackingToken as string;
      const orderNumber   = data.orderNumber as string;

      // Guardar en localStorage para acceso desde el menú y recuperación ante cierre de pestaña
      try {
        localStorage.setItem(`haloo_last_order_${tenant.slug}`, JSON.stringify({
          orderId: trackingToken, orderNumber, ts: Date.now(),
        }));
      } catch { /* */ }

      clearCart();

      // Si el tenant tiene WhatsApp, mostrar gate antes de ir al tracking
      if (tenant.whatsappNumber) {
        const DEFAULT_TEMPLATE =
          "Hola! Quiero hacer un pedido:\n{items}\n\nSubtotal: {subtotal}\n{delivery}\nTotal: {total}\n\nDatos de entrega:\nNombre: {name}\nDirección: {address}\nPago: {payment}";
        const msg = buildWhatsAppMessage({
          template:      tenant.whatsappMessageTemplate ?? DEFAULT_TEMPLATE,
          items,
          subtotal,
          deliveryCost,
          total,
          customerName:  customerName.trim(),
          address:       deliveryType === "DELIVERY" ? address.trim() : "Recoger en local",
          paymentMethod,
          deliveryType,
          costPending:   deliveryType === "DELIVERY" && useMapDelivery,
          notes:         notes.trim() || undefined,
        });
        setWaGate({ url: buildWhatsAppUrl(tenant.whatsappNumber, msg), orderNumber, orderId: trackingToken });
        setSubmitting(false);
        return;
      }

      router.push(`/${tenant.slug}/pedido/${trackingToken}`);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  // ── Gate de WhatsApp ─────────────────────────────────────────────────────────
  if (waGate) {
    return (
      <div style={{ minHeight: "100dvh", background: "#f0fdf4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 0 }}>
        <style>{`
          @keyframes waPulse { 0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,0.5)} 50%{box-shadow:0 0 0 14px rgba(37,211,102,0)} }
          .wa-btn-pulse { animation: waPulse 1.8s ease-in-out infinite; }
        `}</style>

        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center" }}>

          {/* Icono */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(37,211,102,0.4)" }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="#fff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>

          {/* Texto */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#16a34a", margin: 0 }}>
              Pedido #{waGate.orderNumber} creado
            </p>
            <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: 26, color: "#14532d", margin: 0, lineHeight: 1.2 }}>
              Un último paso para confirmarlo
            </h1>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "#15803d", margin: 0, lineHeight: 1.6 }}>
              Envía el mensaje al restaurante por WhatsApp.<br />
              <strong>Sin este paso no pueden preparar tu pedido.</strong>
            </p>
          </div>

          {/* Botón WhatsApp — anchor real, nunca bloqueado */}
          <a
            href={waGate.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTimeout(() => router.push(`/${tenant.slug}/pedido/${waGate.orderId}`), 800)}
            className="wa-btn-pulse"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              width: "100%", padding: "18px 24px", borderRadius: 100,
              background: "#25d366", color: "#fff", textDecoration: "none",
              fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: 17,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar pedido por WhatsApp
          </a>

          {/* Salida secundaria */}
          <button
            onClick={() => router.push(`/${tenant.slug}/pedido/${waGate.orderId}`)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 13, color: "#16a34a", textDecoration: "underline", padding: 0 }}
          >
            Ya lo envié, ver mi pedido →
          </button>

        </div>
      </div>
    );
  }

  // Bloquear si no hay ningún método de pago configurado
  if (paymentOptions.length === 0) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "var(--menu-bg)" }}>
        <span style={{ fontSize: 56 }}>💳</span>
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 16, fontWeight: 700, color: "var(--menu-primary)", margin: 0 }}>Pagos no disponibles</p>
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--menu-muted)", margin: 0, textAlign: "center", maxWidth: 300 }}>
          El restaurante no tiene métodos de pago configurados. Intenta más tarde o contacta directamente.
        </p>
        <Link href={`/${tenant.slug}`} style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, color: "var(--menu-accent)", textDecoration: "none" }}>
          ← Volver al menú
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !submitting) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "var(--menu-bg)" }}>
        <span style={{ fontSize: 56 }}>🛒</span>
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 16, color: "var(--menu-muted)" }}>Tu carrito está vacío.</p>
        <Link href={`/${tenant.slug}`} style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, color: "var(--menu-accent)", textDecoration: "none" }}>
          ← Volver al menú
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--menu-bg)", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--menu-border)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <Link href={`/${tenant.slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, border: "1px solid var(--menu-border)", textDecoration: "none", fontSize: 18 }}>
          ←
        </Link>
        <div>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700, fontSize: 18, color: "var(--menu-primary)", margin: 0 }}>
            Finalizar pedido
          </h1>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-muted)", margin: 0 }}>
            {tenant.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Resumen del pedido ── */}
        <Section title="Tu pedido">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, color: "var(--menu-primary)", margin: 0 }}>
                    {item.quantity}× {item.productName}
                  </p>
                  {item.selectedOptions.length > 0 && (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", margin: "2px 0 0" }}>
                      {item.selectedOptions.map(o => o.optionName).join(", ")}
                    </p>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13, color: "var(--menu-accent)", whiteSpace: "nowrap" }}>
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Datos del cliente ── */}
        <Section title="Tus datos">
          <Field label="Nombre completo" required>
            <input
              type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="¿Cómo te llamamos?" required
              style={inputStyle}
            />
          </Field>
          <Field label="Teléfono de contacto" required>
            <input
              type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              placeholder="+52 55 1234 5678" required
              style={inputStyle}
            />
          </Field>
        </Section>

        {/* ── Tipo de entrega ── */}
        <Section title="¿Cómo quieres recibirlo?">
          {availableTypes.length === 0 ? (
            <div style={{ padding: "14px 16px", background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#dc2626", margin: 0 }}>
                Este restaurante no tiene opciones de entrega disponibles. Contáctalos directamente.
              </p>
            </div>
          ) : availableTypes.length === 1 ? (
            /* Solo una opción: mostrar como info, no como selector */
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--menu-accent-soft, #fff7ed)", borderRadius: 12, border: "2px solid var(--menu-accent)" }}>
              <span style={{ fontSize: 24 }}>{deliveryType === "DELIVERY" ? "🛵" : "🏠"}</span>
              <div>
                <p style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, color: "var(--menu-primary)", margin: 0 }}>
                  {deliveryType === "DELIVERY" ? "A domicilio" : "Recoger en local"}
                </p>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", margin: "2px 0 0" }}>
                  {deliveryType === "PICKUP" ? "Sin costo de envío" : "Único método de entrega disponible"}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {availableTypes.map(type => (
                <button
                  key={type} type="button"
                  onClick={() => { setDeliveryType(type); setSelectedZoneId(""); }}
                  style={{
                    padding: "14px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: deliveryType === type ? "2px solid var(--menu-accent)" : "2px solid var(--menu-border)",
                    background: deliveryType === type ? "var(--menu-accent-soft, #fff7ed)" : "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{type === "DELIVERY" ? "🛵" : "🏠"}</div>
                  <p style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13, color: "var(--menu-primary)", margin: 0 }}>
                    {type === "DELIVERY" ? "A domicilio" : "Recoger en local"}
                  </p>
                  {type === "PICKUP" && (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", margin: "2px 0 0" }}>Sin costo de envío</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Dirección de entrega (solo para domicilio) */}
          {deliveryType === "DELIVERY" && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* ── Por zona ── */}
              {!useMapDelivery && (
                <>
                  <ZoneSelect
                    zones={deliveryZones}
                    value={selectedZoneId}
                    onChange={setSelectedZoneId}
                  />
                  <Field label="Calle, número y colonia" required>
                    <input
                      type="text" value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Ej: Insurgentes Sur 1234, Col. Del Valle" required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Referencias (opcional)">
                    <input
                      type="text" value={addressRef} onChange={e => setAddressRef(e.target.value)}
                      placeholder="Ej: Casa azul, entre Eje 7 y Av. Universidad"
                      style={inputStyle}
                    />
                  </Field>
                </>
              )}

              {/* ── Por mapa ── */}
              {useMapDelivery && (
                <>
                  <MapPicker onPick={handleMapPick} />
                  <Field label="Confirma tu dirección" required>
                    <input
                      type="text" value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Se llena al tocar el mapa, puedes editarlo" required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Referencias (opcional)">
                    <input
                      type="text" value={addressRef} onChange={e => setAddressRef(e.target.value)}
                      placeholder="Ej: Casa azul, depto 3B, timbre roto…"
                      style={inputStyle}
                    />
                  </Field>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#15803d", margin: 0, lineHeight: 1.5 }}>
                      El restaurante confirmará el costo de envío a tu ubicación al recibir el pedido.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </Section>

        {/* ── Método de pago ── */}
        {paymentOptions.length > 0 && (
          <Section title="¿Cómo vas a pagar?">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {paymentOptions.map(opt => (
                <label key={opt.value}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: paymentMethod === opt.value ? "2px solid var(--menu-accent)" : "2px solid var(--menu-border)",
                    background: paymentMethod === opt.value ? "var(--menu-accent-soft, #fff7ed)" : "#fff",
                  }}
                >
                  <input
                    type="radio" name="payment" value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value)}
                    style={{ accentColor: "var(--menu-accent)", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--menu-primary)", fontWeight: paymentMethod === opt.value ? 600 : 400 }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Info de transferencia */}
            {paymentMethod === "TRANSFER" && pc?.transferEnabled && (
              <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <p style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 12, color: "#15803d", margin: "0 0 6px" }}>
                  Datos para transferir
                </p>
                {pc.bankName && <InfoRow label="Banco" value={pc.bankName} />}
                {pc.clabe && <InfoRow label="CLABE" value={pc.clabe} mono />}
                {pc.accountHolder && <InfoRow label="Titular" value={pc.accountHolder} />}
              </div>
            )}
          </Section>
        )}

        {/* ── Notas adicionales ── */}
        <Section title="Notas del pedido (opcional)">
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Sin cebolla en todo, alergias, instrucciones especiales..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </Section>

        {/* ── Resumen de totales ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--menu-border)", padding: "16px 18px" }}>
          <TotalRow label="Subtotal" value={subtotal} />
          {deliveryType === "DELIVERY" && !useMapDelivery && (
            <TotalRow
              label={selectedZone ? `Envío — ${selectedZone.name}` : "Envío"}
              value={deliveryCost}
              muted={!selectedZone}
              placeholder={!selectedZone ? "Selecciona zona" : undefined}
            />
          )}
          {deliveryType === "DELIVERY" && useMapDelivery && (
            <TotalRow label="Envío" value={0} muted placeholder="A confirmar por el restaurante" />
          )}
          <div style={{ height: 1, background: "var(--menu-border)", margin: "10px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 16, color: "var(--menu-primary)" }}>Total</span>
            <span style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700, fontSize: 22, color: "var(--menu-primary)" }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Banner: restaurante cerrado */}
        {!isOpen && (
          <div style={{ padding: "14px 16px", background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
            <div>
              <p style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13, color: "#dc2626", margin: "0 0 2px" }}>
                Restaurante cerrado ahora
              </p>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#b91c1c", margin: 0, lineHeight: 1.5 }}>
                No es posible realizar pedidos fuera del horario de atención. Vuelve cuando estemos abiertos.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" }}>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Aviso de privacidad */}
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", textAlign: "center", margin: "0 0 12px" }}>
          Al confirmar aceptas el{" "}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: "var(--menu-accent)", textDecoration: "none" }}>
            aviso de privacidad
          </a>
        </p>

        {/* Submit */}
        <button
          type="submit" disabled={submitting || !isOpen || availableTypes.length === 0}
          style={{
            padding: "16px 24px", borderRadius: 100, border: "none",
            cursor: (submitting || !isOpen || availableTypes.length === 0) ? "not-allowed" : "pointer",
            background: (submitting || !isOpen || availableTypes.length === 0) ? "#d1d5db" : "var(--menu-primary)",
            color: "#fff", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 16,
            boxShadow: (submitting || !isOpen || availableTypes.length === 0) ? "none" : "0 4px 20px rgba(0,0,0,0.2)",
            transition: "all 0.2s",
          }}
        >
          {submitting ? "Enviando pedido..."
            : availableTypes.length === 0 ? "Sin métodos de entrega"
            : !isOpen ? "Restaurante cerrado"
            : "Confirmar pedido →"}
        </button>
      </form>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--menu-border)", padding: "16px 18px" }}>
      <h2 style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13, color: "var(--menu-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 12, color: "var(--menu-primary)" }}>
        {label}{required && <span style={{ color: "var(--menu-accent)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
      <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#16a34a" }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : "var(--font-dm)", fontSize: 12, color: "#15803d", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value, muted, placeholder }: { label: string; value: number; muted?: boolean; placeholder?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--menu-muted)" }}>{label}</span>
      {placeholder
        ? <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#d1d5db", fontStyle: "italic" }}>{placeholder}</span>
        : <span style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, color: muted ? "var(--menu-muted)" : "var(--menu-primary)" }}>
            {formatCurrency(value)}
          </span>
      }
    </div>
  );
}

function checkIfOpen(schedules: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }>) {
  if (schedules.length === 0) return true; // sin horarios configurados = siempre abierto
  const now = new Date();
  const day = now.getDay();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const sched = schedules.find(s => s.dayOfWeek === day && s.isActive);
  if (!sched) return false;
  return time >= sched.openTime && time <= sched.closeTime;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid var(--menu-border)", outline: "none",
  fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--menu-primary)",
  background: "#fafafa", boxSizing: "border-box",
};
