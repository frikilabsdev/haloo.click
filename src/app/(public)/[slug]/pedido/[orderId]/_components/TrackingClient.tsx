"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface OrderTracking {
  id:           string;
  orderNumber:  string;
  status:       string;
  customerName: string;
  deliveryType: "DELIVERY" | "PICKUP";
  createdAt:    string;
  updatedAt:    string;
  tenant: {
    name:           string;
    slug:           string;
    whatsappNumber: string | null;
  };
}

const STEPS = [
  { status: "PENDING",   label: "Recibido",    icon: "📋", desc: "Tu pedido llegó al restaurante" },
  { status: "CONFIRMED", label: "Confirmado",  icon: "✅", desc: "El restaurante lo aceptó" },
  { status: "PREPARING", label: "Preparando",  icon: "👨‍🍳", desc: "Están preparando tu pedido" },
  { status: "READY",     label: "Listo",       icon: "🎉", desc: "Tu pedido está listo" },
  { status: "DELIVERED", label: "Entregado",   icon: "🛵", desc: "¡Buen provecho!" },
];

const STEP_INDEX: Record<string, number> = {
  PENDING: 0, CONFIRMED: 1, PREPARING: 2, READY: 3, DELIVERED: 4, CANCELLED: -1,
};

const POLL_INTERVAL = 15_000;

interface Props {
  orderId:      string;
  slug:         string;
  whatsappUrl:  string | null;
}

export function TrackingClient({ orderId, slug, whatsappUrl }: Props) {
  const [order,    setOrder]    = useState<OrderTracking | null>(null);
  const [error,    setError]    = useState(false);
  const [waSent,   setWaSent]   = useState(false);

  // Leer flag de localStorage al montar
  useEffect(() => {
    try {
      const sent = localStorage.getItem(`haloo_wa_sent_${orderId}`);
      if (sent === "1") setWaSent(true);
    } catch { /* */ }
  }, [orderId]);

  const fetchOrder = useCallback(async () => {
    try {
      const res  = await fetch(`/api/public/orders/${orderId}`);
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      const data: OrderTracking = json.data;
      setOrder(data);

      // Cuando el pedido termina, limpiar localStorage para que el banner desaparezca
      if (data.status === "DELIVERED" || data.status === "CANCELLED") {
        try {
          localStorage.removeItem(`haloo_last_order_${data.tenant.slug}`);
          localStorage.removeItem(`haloo_wa_sent_${orderId}`);
        } catch { /* */ }
      }
    } catch {
      setError(true);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    const id = setInterval(fetchOrder, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchOrder]);

  function handleWaClick() {
    try { localStorage.setItem(`haloo_wa_sent_${orderId}`, "1"); } catch { /* */ }
    setWaSent(true);
  }

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "var(--menu-bg)" }}>
        <span style={{ fontSize: 48 }}>🔍</span>
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 15, color: "var(--menu-muted)", textAlign: "center" }}>
          No encontramos este pedido.
        </p>
        <Link href={`/${slug}`} style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, color: "var(--menu-accent)", textDecoration: "none" }}>
          ← Volver al menú
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--menu-bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--menu-accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--menu-muted)", margin: 0 }}>Buscando tu pedido…</p>
        </div>
      </div>
    );
  }

  const isCancelled  = order.status === "CANCELLED";
  const currentStep  = STEP_INDEX[order.status] ?? 0;
  const currentStepData = STEPS[currentStep];
  const isDelivered  = order.status === "DELIVERED";

  return (
    <div style={{ minHeight: "100dvh", background: "var(--menu-bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 100px" }}>

      {/* Header */}
      <div style={{ width: "100%", background: "#fff", borderBottom: "1px solid var(--menu-border)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <Link href={`/${slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, border: "1px solid var(--menu-border)", textDecoration: "none", fontSize: 18, flexShrink: 0 }}>
          ←
        </Link>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 15, color: "var(--menu-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.tenant.name}
          </p>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--menu-muted)", margin: 0 }}>
            Pedido #{order.orderNumber}
          </p>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 480, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Estado cancelado */}
        {isCancelled ? (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #fecaca", padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
            <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: 22, color: "#dc2626", margin: "0 0 8px" }}>
              Pedido cancelado
            </h1>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--menu-muted)", margin: 0, lineHeight: 1.5 }}>
              Hola {order.customerName}, este pedido fue cancelado. Si tienes dudas, contacta al restaurante.
            </p>
          </div>
        ) : (
          /* Estado activo */
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--menu-border)", overflow: "hidden" }}>

            {/* Header de estado */}
            <div style={{ padding: "24px 20px 20px", textAlign: "center", background: isDelivered ? "#f0fdf4" : "var(--menu-bg)" }}>
              <div style={{ fontSize: 52, marginBottom: 10, animation: !isDelivered && !isCancelled ? "statusBob 2s ease-in-out infinite" : "none" }}>
                {currentStepData?.icon ?? "📋"}
              </div>
              <style>{`@keyframes statusBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
              <h1 style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: 22, color: "var(--menu-primary)", margin: "0 0 6px" }}>
                {currentStepData?.label ?? order.status}
              </h1>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--menu-muted)", margin: "0 0 4px" }}>
                {currentStepData?.desc}
              </p>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-muted)", margin: 0, opacity: 0.6 }}>
                Actualiza automáticamente · {order.customerName}
              </p>
            </div>

            {/* Barra de progreso */}
            <div style={{ padding: "0 20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
                {STEPS.slice(0, -1).map((step, i) => {
                  const done    = i < currentStep;
                  const current = i === currentStep;
                  return (
                    <div key={step.status} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                      {/* Nodo */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: done ? "var(--menu-accent)" : current ? "var(--menu-primary)" : "#e5e7eb",
                        border: current ? "3px solid var(--menu-primary)" : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: current ? "0 0 0 4px rgba(var(--menu-primary-rgb,0,0,0),0.1)" : "none",
                        transition: "all 0.4s",
                        zIndex: 1, position: "relative",
                      }}>
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        ) : (
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: current ? "#fff" : "#9ca3af" }} />
                        )}
                      </div>
                      {/* Línea conectora */}
                      {i < STEPS.length - 2 && (
                        <div style={{ flex: 1, height: 3, background: done ? "var(--menu-accent)" : "#e5e7eb", transition: "background 0.4s" }} />
                      )}
                    </div>
                  );
                })}
                {/* Último nodo (DELIVERED) */}
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: isDelivered ? "var(--menu-accent)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative" }}>
                  {isDelivered ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#9ca3af" }} />
                  )}
                </div>
              </div>

              {/* Labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {STEPS.map((step, i) => (
                  <span key={step.status} style={{ fontFamily: "var(--font-dm)", fontSize: 9, color: i <= currentStep ? "var(--menu-primary)" : "var(--menu-muted)", fontWeight: i === currentStep ? 700 : 400, textAlign: "center", flex: 1 }}>
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info pedido */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--menu-border)", padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-muted)", margin: "0 0 2px" }}>Tipo de entrega</p>
              <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 14, color: "var(--menu-primary)", margin: 0 }}>
                {order.deliveryType === "DELIVERY" ? "🛵 A domicilio" : "🏠 Recoger en local"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-muted)", margin: "0 0 2px" }}>Pedido</p>
              <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "var(--menu-primary)", margin: 0 }}>
                #{order.orderNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Volver al menú */}
        <Link
          href={`/${slug}`}
          style={{ display: "block", padding: "14px 20px", borderRadius: 100, textAlign: "center", border: "2px solid var(--menu-border)", textDecoration: "none", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, color: "var(--menu-primary)", background: "#fff" }}
        >
          Volver al menú
        </Link>
      </div>

      {/* WhatsApp sticky — solo si no lo han enviado aún */}
      {!waSent && whatsappUrl && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", background: "#fff", borderTop: "1px solid var(--menu-border)", zIndex: 50, display: "flex", flexDirection: "column", gap: 6 }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWaClick}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 20px", borderRadius: 100, textDecoration: "none", background: "#25d366", color: "#fff", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 15 }}
          >
            <WaIcon size={20} />
            Enviar pedido por WhatsApp
          </a>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", margin: 0, textAlign: "center" }}>
            El restaurante necesita recibir tu mensaje para prepararlo
          </p>
        </div>
      )}
    </div>
  );
}

function WaIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
