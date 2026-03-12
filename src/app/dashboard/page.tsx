import { requireSession } from "@/lib/session";
import { getTenantByUserId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@prisma/client";

export default async function DashboardPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const acceptedRevenueStatuses: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "DELIVERED"];

  // Métricas del día + pedidos recientes en paralelo
  const [todayOrders, pendingOrders, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: todayStart },
        status: { in: acceptedRevenueStatuses },
      },
      select: { total: true, status: true },
    }),
    prisma.order.count({
      where: { tenantId: tenant.id, status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } },
    }),
    prisma.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        items: { select: { productName: true, quantity: true } },
      },
    }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const todayCount = todayOrders.length;
  const todayDelivered = todayOrders.filter(o => o.status === "DELIVERED").length;

  const serialized = JSON.parse(JSON.stringify(recentOrders));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 24, color: "var(--dash-text)", margin: "0 0 3px", letterSpacing: "-0.03em" }}>
            Resumen
          </h1>
          <p style={{ fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 600, color: "var(--dash-muted)", margin: 0, textTransform: "capitalize" }}>
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {pendingOrders > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--dash-orange-soft)", padding: "7px 14px",
            borderRadius: 100, border: "1px solid rgba(232,49,42,0.15)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--dash-orange)", display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 800, color: "var(--dash-orange)" }}>
              {pendingOrders} activo{pendingOrders !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Métricas */}
      <style>{`
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 600px) {
          .metrics-row {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
          }
          .metrics-row > * {
            min-width: 155px;
            scroll-snap-align: start;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
      <div className="metrics-row">
        <MetricCard
          label="Ingresos hoy"
          value={formatCurrency(todayRevenue)}
          sub={`${todayCount} pedido${todayCount !== 1 ? "s" : ""} aceptado${todayCount !== 1 ? "s" : ""}`}
          accent="var(--dash-orange)"
          accentSoft="var(--dash-orange-soft)"
          icon={<IconRevenue />}
        />
        <MetricCard
          label="En proceso"
          value={String(pendingOrders)}
          sub="pendientes"
          accent="var(--dash-blue)"
          accentSoft="var(--dash-blue-soft)"
          icon={<IconClock />}
        />
        <MetricCard
          label="Entregados"
          value={String(todayDelivered)}
          sub={`de ${todayCount} aceptados`}
          accent="var(--dash-green)"
          accentSoft="var(--dash-green-soft)"
          icon={<IconCheck />}
        />
      </div>

      {/* Pedidos recientes */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 16, color: "var(--dash-text)", margin: 0, letterSpacing: "-0.02em" }}>
            Pedidos recientes
          </h2>
          <a href="/dashboard/pedidos" style={{
            fontFamily: "var(--font-nunito)", fontSize: 12, color: "var(--dash-orange)",
            textDecoration: "none", fontWeight: 800,
            padding: "5px 12px", borderRadius: 100,
            background: "var(--dash-orange-soft)",
          }}>
            Ver todos →
          </a>
        </div>

        {serialized.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {serialized.map((order: OrderRow) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tipos locales ─────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryType: string;
  paymentMethod: string;
  status: string;
  total: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

// ── Componentes ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent, accentSoft, icon }: {
  label: string; value: string; sub: string;
  accent: string; accentSoft: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--dash-surface)", borderRadius: 16,
      border: "1px solid var(--dash-border)", padding: "18px 18px 16px",
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      transition: "box-shadow 0.18s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 800, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          {label}
        </p>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: accentSoft, display: "flex", alignItems: "center", justifyContent: "center", color: accent }}>
          {icon}
        </div>
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 28, color: "var(--dash-text)", margin: "0 0 1px", letterSpacing: "-0.035em", lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 600, color: "var(--dash-muted)", margin: 0 }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; soft: string }> = {
  PENDING:   { label: "Nuevo",       color: "var(--dash-red)",   soft: "var(--dash-red-soft)"   },
  CONFIRMED: { label: "Confirmado",  color: "var(--dash-blue)",  soft: "var(--dash-blue-soft)"  },
  PREPARING: { label: "Preparando",  color: "var(--dash-amber)", soft: "var(--dash-amber-soft)" },
  READY:     { label: "Listo",       color: "var(--dash-green)", soft: "var(--dash-green-soft)" },
  DELIVERED: { label: "Entregado",   color: "var(--dash-gray)",  soft: "var(--dash-gray-soft)"  },
  CANCELLED: { label: "Cancelado",   color: "var(--dash-gray)",  soft: "var(--dash-gray-soft)"  },
};

const DELIVERY_LABEL: Record<string, string> = {
  DELIVERY: "Domicilio",
  PICKUP: "Recoger",
};

function OrderCard({ order }: { order: OrderRow }) {
  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const elapsed = formatElapsed(order.createdAt);

  return (
    <div style={{
      background: "var(--dash-surface)", borderRadius: 14,
      border: "1px solid var(--dash-border)",
      display: "flex", overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.15s",
    }}>
      {/* Barra lateral de estado */}
      <div style={{ width: 4, flexShrink: 0, background: st.color }} />

      <div style={{ flex: 1, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Número + cliente */}
        <div style={{ flex: 1, minWidth: 110 }}>
          <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 13, color: "var(--dash-text)", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
            {order.customerName}
          </p>
          <p style={{ fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 700, color: "var(--dash-muted)", margin: 0 }}>
            #{order.orderNumber}
          </p>
        </div>

        {/* Items */}
        <p style={{ fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 600, color: "var(--dash-muted)", margin: 0, flex: 2, minWidth: 130 }}>
          {order.items.slice(0, 2).map(i => `${i.quantity}× ${i.productName}`).join(" · ")}
          {order.items.length > 2 ? ` +${order.items.length - 2}` : ""}
        </p>

        {/* Estado + precio */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{
            fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 800,
            padding: "3px 9px", borderRadius: 100,
            background: st.soft, color: st.color,
          }}>
            {st.label}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 600, color: "var(--dash-muted)" }}>
              {DELIVERY_LABEL[order.deliveryType]}
            </span>
            <span style={{ fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 600, color: "var(--dash-muted)" }}>
              {elapsed}
            </span>
            <span style={{ fontFamily: "var(--font-nunito)", fontSize: 14, fontWeight: 900, color: "var(--dash-text)", letterSpacing: "-0.02em" }}>
              {formatCurrency(Number(order.total))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      background: "var(--dash-surface)", border: "1px solid var(--dash-border)",
      borderRadius: 16, padding: "48px 24px", textAlign: "center",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--dash-orange-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--dash-orange)" }}>
        <IconOrders />
      </div>
      <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 15, color: "var(--dash-text)", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
        Sin pedidos aún
      </p>
      <p style={{ fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 600, color: "var(--dash-muted)", margin: 0 }}>
        Cuando lleguen pedidos aparecerán aquí.
      </p>
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

// Íconos
function IconRevenue() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1v14M5 4h4.5a2.5 2.5 0 010 5H5M5 9h5a2.5 2.5 0 010 5H5" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l3.5 3.5L13 4.5" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h12M2 8h8M2 13h5" />
      <circle cx="13" cy="11.5" r="2.5" />
      <path d="M13 10.5v1l.75.75" />
    </svg>
  );
}
