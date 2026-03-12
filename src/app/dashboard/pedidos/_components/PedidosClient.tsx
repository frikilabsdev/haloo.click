"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SelectedOption {
  optionGroupName: string;
  optionName: string;
  price: number;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  notes: string | null;
  selectedOptions: SelectedOption[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  address: string | null;
  addressRef: string | null;
  paymentMethod: string;
  notes: string | null;
  subtotal: string;
  deliveryCost: string | null;
  total: string;
  createdAt: string;
  deliveryZone: { name: string } | null;
  items: OrderItem[];
}

// ── Config de estados ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; soft: string;
  next: string | null; nextLabel: string | null;
}> = {
  PENDING:   { label: "Nuevo",      color: "var(--dash-red)",   soft: "var(--dash-red-soft)",   next: "CONFIRMED", nextLabel: "Confirmar"  },
  CONFIRMED: { label: "Confirmado", color: "var(--dash-blue)",  soft: "var(--dash-blue-soft)",  next: "PREPARING", nextLabel: "Preparando" },
  PREPARING: { label: "Preparando", color: "var(--dash-amber)", soft: "var(--dash-amber-soft)", next: "READY",     nextLabel: "Listo"      },
  READY:     { label: "Listo",      color: "var(--dash-green)", soft: "var(--dash-green-soft)", next: "DELIVERED", nextLabel: "Entregado"  },
  DELIVERED: { label: "Entregado",  color: "var(--dash-gray)",  soft: "var(--dash-gray-soft)",  next: null,        nextLabel: null         },
  CANCELLED: { label: "Cancelado",  color: "var(--dash-gray)",  soft: "var(--dash-gray-soft)",  next: null,        nextLabel: null         },
};

const FILTER_TABS = [
  { value: "active",    label: "Activos"     },
  { value: "PENDING",   label: "Nuevos"      },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "PREPARING", label: "Preparando"  },
  { value: "READY",     label: "Listos"      },
  { value: "DELIVERED", label: "Entregados"  },
];

const PAYMENT_LABEL: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  CARD:     "Tarjeta",
};

// ── Componente principal ──────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000; // 30 segundos

function beepNewOrder() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // Browser sin soporte — silencioso
  }
}

export function PedidosClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders]         = useState<Order[]>(initialOrders);
  const [filter, setFilter]         = useState("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [newCount, setNewCount]     = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const knownIds = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));

  // Solicitar permiso de notificaciones del navegador al montar
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const json = await res.json();
      const fresh: Order[] = json.data ?? [];

      // Detectar IDs nuevos con status PENDING
      const incoming = fresh.filter(o => !knownIds.current.has(o.id));
      const newPending = incoming.filter(o => o.status === "PENDING");

      if (incoming.length > 0) {
        incoming.forEach(o => knownIds.current.add(o.id));
      }

      // Merge: mantener status actualizados localmente, añadir nuevos al frente
      setOrders(prev => {
        const prevMap = new Map(prev.map(o => [o.id, o]));
        const merged = fresh.map(o => prevMap.get(o.id) ?? o);
        return merged;
      });

      if (newPending.length > 0) {
        setNewCount(c => c + newPending.length);
        beepNewOrder();
        // Notificación del sistema si el tab no está visible
        if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
          new Notification("🔔 Nuevo pedido — Haloo", {
            body: newPending.length === 1
              ? `Pedido de ${newPending[0].customerName}`
              : `${newPending.length} pedidos nuevos`,
            icon: "/favicon.ico",
            tag: "nuevo-pedido",
          });
        }
      }

      setLastUpdated(new Date());
    } catch {
      // Error de red — ignorar silenciosamente
    }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  // Actualizar title con pedidos pendientes
  const pendingCount = useMemo(() => orders.filter(o => o.status === "PENDING").length, [orders]);
  useEffect(() => {
    document.title = pendingCount > 0
      ? `(${pendingCount}) Pedidos — Haloo`
      : "Pedidos — Haloo";
    return () => { document.title = "Haloo"; };
  }, [pendingCount]);

  const filtered = useMemo(() => {
    if (filter === "active") return orders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.status));
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const selected = orders.find(o => o.id === selectedId) ?? null;

  const counts = useMemo(() => ({
    active:    orders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.status)).length,
    PENDING:   orders.filter(o => o.status === "PENDING").length,
    CONFIRMED: orders.filter(o => o.status === "CONFIRMED").length,
    PREPARING: orders.filter(o => o.status === "PREPARING").length,
    READY:     orders.filter(o => o.status === "READY").length,
    DELIVERED: orders.filter(o => o.status === "DELIVERED").length,
  }), [orders]);

  async function advanceStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!confirm("¿Cancelar este pedido?")) return;
    await advanceStatus(orderId, "CANCELLED");
    if (selectedId === orderId) setSelectedId(null);
  }

  return (
    <>
      <style>{`
        /* ── Layout grid ────────────────────────────────────────── */
        .orders-layout { display: grid; grid-template-columns: 1fr; gap: 12px; align-items: start; }
        .orders-layout.has-detail { grid-template-columns: 1fr 360px; }

        /* ── Panel detalle: desktop side panel ──────────────────── */
        .order-detail-panel {
          background: var(--dash-surface);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          overflow: hidden;
          position: sticky;
          top: 76px;
        }
        .order-detail-scrim { display: none; }
        .order-detail-drag  { display: none; }

        /* ── Panel detalle: mobile bottom sheet ─────────────────── */
        @media (max-width: 767px) {
          .orders-layout.has-detail { grid-template-columns: 1fr; }

          .order-detail-scrim {
            display: block;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.35);
            z-index: 60;
            animation: scrimIn 0.22s ease;
          }
          .order-detail-panel {
            position: fixed;
            bottom: 0; left: 0; right: 0; top: auto !important;
            max-height: 92dvh;
            border-radius: 20px 20px 0 0;
            border: none;
            border-top: 1px solid var(--dash-border);
            z-index: 61;
            overflow-y: auto;
            overscroll-behavior: contain;
            animation: sheetUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
            padding-bottom: calc(var(--dash-bottom-nav-h, 56px) + env(safe-area-inset-bottom, 0px));
            display: flex; flex-direction: column;
          }
          .order-detail-drag {
            display: flex; justify-content: center; padding: 10px 0 4px;
            flex-shrink: 0;
          }
          .order-detail-drag-pill {
            width: 36px; height: 4px;
            background: var(--dash-border); border-radius: 100px;
          }
          /* Acciones pegadas al fondo = thumb zone */
          .order-actions-sticky {
            position: sticky; bottom: 0;
            background: var(--dash-surface);
            border-top: 1px solid var(--dash-border);
            padding: 12px 16px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          }
          /* Touch targets ≥ 48px */
          .order-action-btn { min-height: 52px !important; font-size: 15px !important; border-radius: 12px !important; }
          .order-quick-btn  { min-height: 48px !important; }
          .filter-chip      { padding: 7px 11px !important; }
        }

        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes scrimIn { from { opacity: 0; }               to   { opacity: 1; } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Banner nuevos pedidos */}
        {newCount > 0 && (
          <div
            role="alert"
            style={{ background: "var(--dash-red-soft)", border: "1px solid var(--dash-red)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600, color: "var(--dash-red)" }}>
                {newCount} pedido{newCount > 1 ? "s" : ""} nuevo{newCount > 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => { setNewCount(0); setFilter("PENDING"); }}
              style={{ fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600, color: "var(--dash-red)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              Ver ahora
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 22, color: "var(--dash-text)", margin: "0 0 4px" }}>
              Pedidos
            </h1>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>
              {orders.length} en total
              {lastUpdated && (
                <span style={{ marginLeft: 6, color: "var(--dash-muted)", opacity: 0.7 }}>
                  · actualizado {formatElapsed(lastUpdated.toISOString())}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={poll}
            title="Actualizar ahora"
            aria-label="Actualizar lista"
            style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid var(--dash-border)", background: "var(--dash-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dash-muted)", flexShrink: 0 }}
          >
            <IconRefresh size={16} />
          </button>
        </div>

        {/* Tabs de filtro — scroll horizontal en móvil */}
        <div style={{ display: "flex", gap: 4, background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 10, padding: 4, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {FILTER_TABS.map(tab => {
            const count = counts[tab.value as keyof typeof counts] ?? 0;
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setFilter(tab.value); setSelectedId(null); }}
                className="filter-chip"
                style={{
                  padding: "8px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: active ? 600 : 400,
                  background: active ? "var(--dash-orange)" : "transparent",
                  color: active ? "#fff" : "var(--dash-muted)",
                  whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 6,
                  minHeight: 40,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 100, background: active ? "rgba(255,255,255,0.25)" : "var(--dash-orange-soft)", color: active ? "#fff" : "var(--dash-orange)" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grid lista + detalle */}
        <div className={`orders-layout${selected ? " has-detail" : ""}`}>

          {/* Lista */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-syne)", fontWeight: 600, fontSize: 14, color: "var(--dash-text)", margin: "0 0 6px" }}>Sin pedidos</p>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>No hay pedidos en esta categoría.</p>
              </div>
            ) : (
              filtered.map(order => {
                const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
                const isSelected = order.id === selectedId;
                return (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(isSelected ? null : order.id)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedId(isSelected ? null : order.id); }}
                    style={{
                      background: "var(--dash-surface)", borderRadius: 12,
                      outline: isSelected ? "2px solid var(--dash-orange)" : "1px solid var(--dash-border)",
                      display: "flex", overflow: "hidden", cursor: "pointer",
                      textAlign: "left", width: "100%", transition: "outline 0.1s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {/* Barra de estado — signature element */}
                    <div style={{ width: 4, flexShrink: 0, background: st.color }} />

                    <div style={{ flex: 1, padding: "13px 14px", display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, color: "var(--dash-text)" }}>
                            {order.customerName}
                          </span>
                          <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 100, background: st.soft, color: st.color, whiteSpace: "nowrap" }}>
                            {st.label}
                          </span>
                        </div>
                        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {order.items.slice(0, 2).map(i => `${i.quantity}× ${i.productName}`).join(" · ")}
                          {order.items.length > 2 ? ` +${order.items.length - 2}` : ""}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 14, color: "var(--dash-text)", margin: "0 0 2px" }}>
                          {formatCurrency(Number(order.total))}
                        </p>
                        <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--dash-muted)", margin: 0 }}>
                          {formatElapsed(order.createdAt)}
                        </p>
                      </div>

                      {/* Botón de avance rápido */}
                      {st.next && (
                        <div style={{ gridColumn: "1 / -1", marginTop: 8, display: "flex", gap: 8 }}>
                          <button
                            className="order-quick-btn"
                            onClick={e => { e.stopPropagation(); advanceStatus(order.id, st.next!); }}
                            disabled={updating === order.id}
                            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "none", cursor: updating === order.id ? "not-allowed" : "pointer", background: st.color, color: "#fff", fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 12, opacity: updating === order.id ? 0.6 : 1, transition: "opacity 0.15s", minHeight: 44 }}
                          >
                            {updating === order.id ? "..." : `Marcar como ${st.nextLabel}`}
                          </button>
                          {!["DELIVERED", "CANCELLED"].includes(order.status) && (
                            <button
                              onClick={e => { e.stopPropagation(); cancelOrder(order.id); }}
                              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--dash-border)", cursor: "pointer", background: "transparent", fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", minHeight: 44 }}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel detalle */}
          {selected && (
            <>
              <div className="order-detail-scrim" onClick={() => setSelectedId(null)} aria-hidden="true" />
              <div className="order-detail-panel">
                <div className="order-detail-drag" aria-hidden="true">
                  <div className="order-detail-drag-pill" />
                </div>
                <OrderDetail
                  order={selected}
                  onClose={() => setSelectedId(null)}
                  onAdvance={advanceStatus}
                  onCancel={cancelOrder}
                  updating={updating === selected.id}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Panel detalle ─────────────────────────────────────────────────────────────

function OrderDetail({ order, onClose, onAdvance, onCancel, updating }: {
  order: Order;
  onClose: () => void;
  onAdvance: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  updating: boolean;
}) {
  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--dash-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 15, color: "var(--dash-text)" }}>
              {order.customerName}
            </span>
            <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: st.soft, color: st.color, whiteSpace: "nowrap" }}>
              {st.label}
            </span>
          </div>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--dash-muted)", margin: "3px 0 0" }}>
            #{order.orderNumber} · {formatElapsed(order.createdAt)}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar detalle"
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--dash-muted)", flexShrink: 0, borderRadius: 8 }}
        >
          <IconClose size={18} />
        </button>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

        <DetailSection title="Productos">
          {order.items.map((item, i) => (
            <div key={i} style={{ paddingBottom: i < order.items.length - 1 ? 10 : 0, borderBottom: i < order.items.length - 1 ? "1px solid var(--dash-border)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, color: "var(--dash-text)", margin: 0 }}>
                    {item.quantity}× {item.productName}
                  </p>
                  {item.selectedOptions.length > 0 && (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", margin: "3px 0 0", lineHeight: 1.5 }}>
                      {item.selectedOptions.map(o => o.optionName).join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-amber)", margin: "4px 0 0", fontStyle: "italic" }}>
                      Nota: {item.notes}
                    </p>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 13, color: "var(--dash-text)", whiteSpace: "nowrap" }}>
                  {formatCurrency(Number(item.total))}
                </span>
              </div>
            </div>
          ))}
        </DetailSection>

        <DetailSection title="Cliente y entrega">
          <DetailRow label="Teléfono" value={order.customerPhone} />
          <DetailRow label="Entrega" value={order.deliveryType === "DELIVERY" ? "A domicilio" : "Recoger en local"} />
          {order.deliveryZone && <DetailRow label="Zona" value={order.deliveryZone.name} />}
          {order.address && <DetailRow label="Dirección" value={order.address} />}
          {order.addressRef && <DetailRow label="Referencia" value={order.addressRef} />}
        </DetailSection>

        <DetailSection title="Pago">
          <DetailRow label="Método" value={PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} />
          <DetailRow label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
          {Number(order.deliveryCost ?? 0) > 0 && (
            <DetailRow label="Envío" value={formatCurrency(Number(order.deliveryCost))} />
          )}
          <div style={{ height: 1, background: "var(--dash-border)", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13, color: "var(--dash-text)" }}>Total</span>
            <span style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 16, color: "var(--dash-text)" }}>
              {formatCurrency(Number(order.total))}
            </span>
          </div>
        </DetailSection>

        {order.notes && (
          <DetailSection title="Notas del pedido">
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)", margin: 0, lineHeight: 1.5 }}>
              {order.notes}
            </p>
          </DetailSection>
        )}
      </div>

      {/* Acciones — sticky al fondo → thumb zone en móvil */}
      {st.next && (
        <div
          className="order-actions-sticky"
          style={{ padding: "12px 16px", borderTop: "1px solid var(--dash-border)", display: "flex", flexDirection: "column", gap: 8, background: "var(--dash-surface)", flexShrink: 0 }}
        >
          <button
            className="order-action-btn"
            onClick={() => onAdvance(order.id, st.next!)}
            disabled={updating}
            style={{ padding: "14px", borderRadius: 10, border: "none", cursor: updating ? "not-allowed" : "pointer", background: st.color, color: "#fff", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, opacity: updating ? 0.6 : 1, transition: "opacity 0.15s", minHeight: 52 }}
          >
            {updating ? "Actualizando..." : `Marcar como ${st.nextLabel}`}
          </button>
          {!["DELIVERED", "CANCELLED"].includes(order.status) && (
            <button
              className="order-action-btn"
              onClick={() => onCancel(order.id)}
              style={{ padding: "12px", borderRadius: 10, border: "1px solid var(--dash-border)", cursor: "pointer", background: "transparent", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", minHeight: 48 }}
            >
              Cancelar pedido
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Auxiliares ────────────────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-dm)", fontSize: 10, fontWeight: 700, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-text)", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function formatElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function IconRefresh({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8A5.5 5.5 0 112.5 5M2.5 2v3h3" />
    </svg>
  );
}

function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}
