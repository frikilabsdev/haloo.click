"use client";

import { useState } from "react";

interface TenantRow {
  id:             string;
  slug:           string;
  name:           string;
  type:           string | null;
  city:           { name: string } | null;
  state:          { name: string } | null;
  status:         "PENDING" | "ACTIVE" | "SUSPENDED";
  plan:           "BASIC" | "PRO";
  whatsappNumber: string | null;
  createdAt:      string;
  users:          Array<{ user: { email: string; name: string | null }; role: string }>;
  _count:         { orders: number; products: number };
}

type TenantFilter = "ALL" | "PENDING" | "ACTIVE" | "SUSPENDED";

const FILTERS: TenantFilter[] = ["ALL", "PENDING", "ACTIVE", "SUSPENDED"];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: "#FEF3C7", color: "#92400E", label: "Pendiente"  },
  ACTIVE:    { bg: "#D1FAE5", color: "#065F46", label: "Activo"     },
  SUSPENDED: { bg: "#FEE2E2", color: "#991B1B", label: "Suspendido" },
};

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  BASIC: { bg: "#E2E8F0", color: "#475569" },
  PRO:   { bg: "#EDE9FE", color: "#5B21B6" },
};

const tenantsResponsiveCss = `
  .tenants-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    align-items: center;
  }

  .tenant-filters {
    display: flex;
    gap: 6px;
  }

  .tenants-desktop-table {
    display: block;
  }

  .tenants-mobile-list {
    display: none;
  }

  @media (max-width: 960px) {
    .tenants-toolbar {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }

    .tenants-search {
      width: 100% !important;
      min-height: 44px;
      font-size: 16px !important;
    }

    .tenant-filters {
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .tenant-filters::-webkit-scrollbar {
      display: none;
    }

    .tenant-filter-btn {
      white-space: nowrap;
      min-height: 40px;
      padding: 0 14px !important;
      font-size: 13px !important;
    }

    .tenants-desktop-table {
      display: none;
    }

    .tenants-mobile-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .tenant-actions-wrap {
      gap: 8px !important;
    }

    .tenant-actions-wrap > button,
    .tenant-actions-wrap > a {
      min-height: 38px;
      padding-top: 9px !important;
      padding-bottom: 9px !important;
    }
  }
`;

export function TenantsClient({ initialTenants }: { initialTenants: TenantRow[] }) {
  const [tenants, setTenants] = useState<TenantRow[]>(initialTenants);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<TenantFilter>("ALL");
  const [loading,  setLoading]  = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                        t.slug.toLowerCase().includes(search.toLowerCase()) ||
                        t.users[0]?.user.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || t.status === filter;
    return matchSearch && matchFilter;
  });

  async function destroy(id: string, name: string) {
    if (!confirm(`¿Eliminar permanentemente "${name}" con todo su menú y pedidos? Esta acción NO se puede deshacer.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
      if (!res.ok) { alert("Error al eliminar."); return; }
      setTenants(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function patch(id: string, data: { status?: string; plan?: string }) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { alert("Error al actualizar."); return; }
      const json = await res.json();
      setTenants(prev => prev.map(t => t.id === id ? { ...t, ...json.data } : t));
    } finally {
      setLoading(null);
    }
  }

  const counts = {
    ALL:       tenants.length,
    PENDING:   tenants.filter(t => t.status === "PENDING").length,
    ACTIVE:    tenants.filter(t => t.status === "ACTIVE").length,
    SUSPENDED: tenants.filter(t => t.status === "SUSPENDED").length,
  };

  function renderActions(t: TenantRow, isLoading: boolean) {
    return (
      <div className="tenant-actions-wrap" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {t.status === "PENDING" && (
          <button
            onClick={() => patch(t.id, { status: "ACTIVE" })}
            disabled={isLoading}
            style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "#059669", color: "#fff", opacity: isLoading ? 0.6 : 1 }}>
            Aprobar
          </button>
        )}
        {t.status === "ACTIVE" && (
          <button
            onClick={() => { if (confirm(`¿Suspender ${t.name}?`)) patch(t.id, { status: "SUSPENDED" }); }}
            disabled={isLoading}
            style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "#DC2626", color: "#fff", opacity: isLoading ? 0.6 : 1 }}>
            Suspender
          </button>
        )}
        {t.status === "SUSPENDED" && (
          <button
            onClick={() => patch(t.id, { status: "ACTIVE" })}
            disabled={isLoading}
            style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "#2563EB", color: "#fff", opacity: isLoading ? 0.6 : 1 }}>
            Reactivar
          </button>
        )}
        {t.plan === "BASIC" && (
          <button
            onClick={() => patch(t.id, { plan: "PRO" })}
            disabled={isLoading}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #7C3AED", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "transparent", color: "#A78BFA", opacity: isLoading ? 0.6 : 1 }}>
            → PRO
          </button>
        )}
        {t.plan === "PRO" && (
          <button
            onClick={() => patch(t.id, { plan: "BASIC" })}
            disabled={isLoading}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #334155", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "transparent", color: "#64748B", opacity: isLoading ? 0.6 : 1 }}>
            → BASIC
          </button>
        )}
        <a href={`/${t.slug}`} target="_blank" rel="noopener noreferrer"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #334155", fontSize: 12, fontWeight: 600, background: "transparent", color: "#94A3B8", textDecoration: "none" }}>
          Ver menú
        </a>
        <button
          onClick={() => destroy(t.id, t.name)}
          disabled={deleting === t.id || isLoading}
          title="Eliminar permanentemente"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.4)", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "rgba(220,38,38,0.08)", color: "#F87171", opacity: (deleting === t.id || isLoading) ? 0.5 : 1 }}>
          {deleting === t.id ? "..." : "Eliminar"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <style>{tenantsResponsiveCss}</style>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 24, color: "#F8FAFC", margin: "0 0 4px" }}>
          Restaurantes
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 14, margin: 0 }}>
          {tenants.length} restaurante{tenants.length !== 1 ? "s" : ""} registrado{tenants.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters + search */}
      <div className="tenants-toolbar">
        <input
          className="tenants-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, slug o email..."
          style={{
            flex: "1 1 240px", padding: "10px 14px",
            background: "#1E293B", border: "1px solid #334155",
            borderRadius: 10, color: "#F8FAFC", fontSize: 14,
            fontFamily: "var(--font-dm)", outline: "none",
          }}
        />
        <div className="tenant-filters">
          {FILTERS.map(s => (
            <button key={s} className="tenant-filter-btn" onClick={() => setFilter(s)}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600,
                background: filter === s ? "#F4721E" : "#1E293B",
                color:      filter === s ? "#fff" : "#94A3B8",
              }}>
              {s === "ALL" ? "Todos" : STATUS_STYLE[s].label} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#1E293B", borderRadius: 14, border: "1px solid #334155", overflow: "hidden", marginBottom: 10 }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: "48px 0", color: "#475569", fontSize: 14 }}>
            Sin resultados
          </p>
        ) : (
          <div className="tenants-desktop-table" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {["Restaurante", "Email dueño", "Estado", "Plan", "Pedidos", "Productos", "Acciones"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 700,
                      color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const owner = t.users[0]?.user;
                  const statusStyle = STATUS_STYLE[t.status];
                  const planStyle   = PLAN_STYLE[t.plan];
                  const isLoading   = loading === t.id;
                  return (
                    <tr key={t.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #1E293B" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      {/* Restaurante */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#F8FAFC" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                          /{t.slug}{t.city ? ` · ${t.city.name}` : ""}{t.state ? `, ${t.state.name}` : ""}{t.type ? ` · ${t.type}` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>
                          {new Date(t.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      {/* Email */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 13, color: "#CBD5E1" }}>{owner?.email ?? "—"}</div>
                        {owner?.name && <div style={{ fontSize: 11, color: "#475569" }}>{owner.name}</div>}
                      </td>
                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>
                          {statusStyle.label}
                        </span>
                      </td>
                      {/* Plan */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: planStyle.bg, color: planStyle.color }}>
                          {t.plan}
                        </span>
                      </td>
                      {/* Counts */}
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#94A3B8", fontWeight: 600 }}>{t._count.orders}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#94A3B8", fontWeight: 600 }}>{t._count.products}</td>
                      {/* Actions */}
                      <td style={{ padding: "14px 16px" }}>
                        {renderActions(t, isLoading)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="tenants-mobile-list">
          {filtered.map(t => {
            const owner = t.users[0]?.user;
            const statusStyle = STATUS_STYLE[t.status];
            const planStyle = PLAN_STYLE[t.plan];
            const isLoading = loading === t.id;
            return (
              <article key={t.id} style={{
                background: "#1E293B",
                border: "1px solid #334155",
                borderRadius: 14,
                padding: 14,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 15, color: "#F8FAFC", margin: 0, lineHeight: 1.2 }}>
                      {t.name}
                    </p>
                    <p style={{ fontSize: 12, color: "#64748B", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      /{t.slug}
                    </p>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color, flexShrink: 0 }}>
                    {statusStyle.label}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: planStyle.bg, color: planStyle.color }}>
                    {t.plan}
                  </span>
                  {t.city?.name && (
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(148,163,184,0.16)", color: "#CBD5E1" }}>
                      {t.city.name}{t.state?.name ? `, ${t.state.name}` : ""}
                    </span>
                  )}
                  {t.type && (
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(37,99,235,0.14)", color: "#93C5FD" }}>
                      {t.type}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
                  <div style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 9, padding: "8px 10px" }}>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 11 }}>Pedidos</p>
                    <p style={{ margin: "2px 0 0", color: "#E2E8F0", fontSize: 16, fontWeight: 700 }}>{t._count.orders}</p>
                  </div>
                  <div style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 9, padding: "8px 10px" }}>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 11 }}>Productos</p>
                    <p style={{ margin: "2px 0 0", color: "#E2E8F0", fontSize: 16, fontWeight: 700 }}>{t._count.products}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, color: "#94A3B8", fontSize: 12 }}>
                    {owner?.email ?? "Sin email"}
                  </p>
                  {owner?.name && <p style={{ margin: "2px 0 0", color: "#64748B", fontSize: 11 }}>{owner.name}</p>}
                  <p style={{ margin: "2px 0 0", color: "#475569", fontSize: 11 }}>
                    Alta: {new Date(t.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>

                {renderActions(t, isLoading)}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
