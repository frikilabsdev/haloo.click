"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { TenantWithRelations } from "@/types";

interface Props {
  tenant: TenantWithRelations;
  userRole: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard",                    label: "Resumen",        icon: IconGrid        },
  { href: "/dashboard/pedidos",            label: "Pedidos",        icon: IconOrders      },
  { href: "/dashboard/menu",               label: "Menú",           icon: IconMenu        },
  { href: "/dashboard/menu/complements",   label: "Complementos",   icon: IconComplement  },
  { href: "/dashboard/configuracion",      label: "Configuración",  icon: IconSettings    },
];

export function DashboardShell({ tenant, isAdmin = false, children }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--dash-canvas)" }}>
      <style>{`
        /* ── CSS variables ─────────────────────────── */
        :root {
          --dash-canvas:      #F5F6FA;
          --dash-surface:     #FFFFFF;
          --dash-border:      #ECEEF2;
          --dash-text:        #1C1C1E;
          --dash-muted:       #8E8E93;
          --dash-orange:      #E8312A;
          --dash-orange-soft: #FEF0EF;
          --dash-red:         #E8312A;
          --dash-red-soft:    #FEF0EF;
          --dash-blue:        #2563EB;
          --dash-blue-soft:   #EFF6FF;
          --dash-amber:       #FF9500;
          --dash-amber-soft:  #FFF7ED;
          --dash-green:       #34C759;
          --dash-green-soft:  #ECFDF5;
          --dash-gray:        #8E8E93;
          --dash-gray-soft:   #F5F6FA;
          --dash-bottom-nav-h: 60px;
        }

        /* ── Sidebar nav items ─────────────────────── */
        .dash-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 12px; text-decoration: none;
          font-family: var(--font-nunito); font-size: 14px; font-weight: 600;
          color: var(--dash-muted); transition: all 0.18s cubic-bezier(0.34,1.2,0.64,1);
          cursor: pointer; border: none; background: none; width: 100%; text-align: left;
          -webkit-tap-highlight-color: transparent;
        }
        .dash-nav-item:hover {
          background: var(--dash-orange-soft);
          color: var(--dash-orange);
          transform: translateX(2px);
        }
        .dash-nav-item.active {
          background: var(--dash-orange-soft);
          color: var(--dash-orange);
          font-weight: 800;
        }
        /* Dot indicator for active item */
        .dash-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          width: 3px; height: 26px;
          background: var(--dash-orange);
          border-radius: 0 3px 3px 0;
        }
        .dash-nav-item { position: relative; }

        /* ── Bottom tab bar (mobile) ───────────────── */
        .dash-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: var(--dash-bottom-nav-h);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--dash-border);
          z-index: 50;
          align-items: stretch;
        }
        .dash-tab-item {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          text-decoration: none;
          color: var(--dash-muted);
          font-family: var(--font-nunito); font-size: 10px; font-weight: 700;
          min-height: 60px;
          transition: color 0.18s;
          -webkit-tap-highlight-color: transparent;
        }
        .dash-tab-item.active { color: var(--dash-orange); }
        .dash-tab-item .tab-indicator {
          width: 34px; height: 28px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s cubic-bezier(0.34,1.2,0.64,1);
        }
        .dash-tab-item.active .tab-indicator {
          background: var(--dash-orange-soft);
          transform: scale(1.08);
        }

        /* ── Responsive layout ─────────────────────── */
        .dash-main {
          flex: 1; padding: 24px 20px;
          max-width: 1100px; width: 100%; margin: 0 auto;
        }

        @media (max-width: 767px) {
          .dash-bottom-nav { display: flex; }
          .dash-sidebar    { display: none !important; }
          .dash-top-bar    { display: none !important; }
          .dash-main {
            padding: 16px 14px;
            padding-bottom: calc(var(--dash-bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 20px);
          }
        }

        @keyframes slideRight {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }

        /* ── Tablet: navigation rail ───────────────── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .dash-sidebar { width: 68px !important; }
          .dash-sidebar .sidebar-label { display: none; }
          .dash-sidebar .sidebar-brand-text { display: none; }
          .dash-sidebar .sidebar-section-label { display: none; }
          .dash-nav-item { justify-content: center; padding: 10px; border-radius: 12px; }
          .dash-nav-item.active::before { display: none; }
        }
      `}</style>

      {/* ── Sidebar desktop ─────────────────────────────────────────── */}
      <aside className="dash-sidebar" style={{
        width: 236, flexShrink: 0,
        background: "var(--dash-surface)",
        borderRight: "1px solid var(--dash-border)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100dvh",
        overflowY: "auto",
        boxShadow: "2px 0 16px rgba(0,0,0,0.04)",
      }}>
        <SidebarContent tenant={tenant} isActive={isActive} isAdmin={isAdmin} />
      </aside>

      {/* ── Drawer mobile (edge case) ────────────────────────────────── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        >
          <aside
            onClick={e => e.stopPropagation()}
            style={{
              width: 236, height: "100%",
              background: "var(--dash-surface)",
              borderRight: "1px solid var(--dash-border)",
              display: "flex", flexDirection: "column",
              animation: "slideRight 0.3s cubic-bezier(0.22,1,0.36,1)",
              boxShadow: "4px 0 32px rgba(0,0,0,0.15)",
            }}
          >
            <SidebarContent tenant={tenant} isActive={isActive} isAdmin={isAdmin} onNav={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Área de contenido ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar desktop */}
        <header className="dash-top-bar" style={{
          height: 54, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 24px",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--dash-border)",
          position: "sticky", top: 0, zIndex: 30,
        }}>
          <span style={{ fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 700, color: "var(--dash-muted)" }}>
            {tenant.name}
          </span>
          <Link
            href={`/${tenant.slug}`} target="_blank"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 800,
              color: "var(--dash-orange)", textDecoration: "none",
              padding: "7px 14px", borderRadius: 100,
              background: "var(--dash-orange-soft)",
              transition: "all 0.15s",
            }}
          >
            <IconLink size={12} />
            Ver menú
          </Link>
        </header>

        <main className="dash-main">{children}</main>
      </div>

      {/* ── Bottom Tab Bar (mobile) ──────────────────────────────────── */}
      <nav className="dash-bottom-nav" aria-label="Navegación principal">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`dash-tab-item${isActive(item.href) ? " active" : ""}`}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <div className="tab-indicator">
              <item.icon size={20} />
            </div>
            <span>{item.label}</span>
          </Link>
        ))}
        {/* Botón menú público en bottom nav */}
        <Link
          href={`/${tenant.slug}`} target="_blank"
          className="dash-tab-item"
          aria-label="Ver menú público"
        >
          <div className="tab-indicator">
            <IconLink size={20} />
          </div>
          <span>Menú</span>
        </Link>
      </nav>
    </div>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({
  tenant, isActive, onNav, isAdmin = false,
}: {
  tenant: TenantWithRelations;
  isActive: (href: string) => boolean;
  onNav?: () => void;
  isAdmin?: boolean;
}) {
  return (
    <>
      {/* Brand */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--dash-border)" }}>
        {/* Haloo logotype */}
        <div className="sidebar-brand-text" style={{ marginBottom: 14 }}>
          <span style={{
            fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 16,
            color: "var(--dash-orange)",
            letterSpacing: "-0.03em",
          }}>
            haloo
          </span>
          <span style={{
            fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 10,
            color: "var(--dash-orange)", opacity: 0.6,
            letterSpacing: "0.08em", textTransform: "uppercase",
            marginLeft: 4,
          }}>
            .click
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {tenant.logo ? (
            <img src={tenant.logo} alt="" style={{ width: 38, height: 38, borderRadius: 12, objectFit: "cover", border: "2px solid var(--dash-border)", flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: "var(--dash-orange-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid var(--dash-border)",
            }}>
              <IconStore size={18} color="var(--dash-orange)" />
            </div>
          )}
          <div className="sidebar-label" style={{ minWidth: 0 }}>
            <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 14, color: "var(--dash-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tenant.name}
            </p>
            <p style={{ fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 600, color: "var(--dash-muted)", margin: "1px 0 0" }}>
              {tenant.city?.name ?? tenant.state?.name ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 10px" }}>
        <p className="sidebar-section-label" style={{ fontFamily: "var(--font-nunito)", fontSize: 10, fontWeight: 800, color: "var(--dash-muted)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 14px 4px", margin: 0 }}>
          Principal
        </p>
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={`dash-nav-item${isActive(item.href) ? " active" : ""}`}
          >
            <item.icon size={16} />
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}

        <p className="sidebar-section-label" style={{ fontFamily: "var(--font-nunito)", fontSize: 10, fontWeight: 800, color: "var(--dash-muted)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "18px 14px 4px", margin: 0 }}>
          Público
        </p>
        <Link href={`/${tenant.slug}`} target="_blank" className="dash-nav-item">
          <IconLink size={16} />
          <span className="sidebar-label">Ver menú</span>
        </Link>

        {isAdmin && (
          <>
            <p className="sidebar-section-label" style={{ fontFamily: "var(--font-nunito)", fontSize: 10, fontWeight: 800, color: "var(--dash-muted)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "18px 14px 4px", margin: 0 }}>
              Admin
            </p>
            <Link href="/admin" onClick={onNav} className="dash-nav-item" style={{ color: "var(--dash-orange)" }}>
              <IconStore size={16} />
              <span className="sidebar-label">Panel Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 10px 16px", borderTop: "1px solid var(--dash-border)" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="dash-nav-item"
        >
          <IconLogout size={16} />
          <span className="sidebar-label">Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}

// ── Íconos ────────────────────────────────────────────────────────────────────

function IconGrid({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconOrders({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h12M2 8h8M2 13h5" />
      <circle cx="13" cy="11.5" r="2.5" />
      <path d="M13 10.5v1l.75.75" />
    </svg>
  );
}

function IconLink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7.5 3.5" />
      <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L8.5 12.5" />
    </svg>
  );
}

function IconLogout({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" />
    </svg>
  );
}

function IconMenu({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="3" rx="1" />
      <rect x="1" y="7" width="14" height="3" rx="1" />
      <rect x="1" y="12" width="8"  height="3" rx="1" />
    </svg>
  );
}

function IconStore({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6.5L3.5 2h9L14 6.5" />
      <path d="M2 6.5h12v1a2 2 0 01-4 0 2 2 0 01-4 0 2 2 0 01-4 0v-1z" />
      <path d="M3 9.5v4h10v-4" />
      <path d="M6 13.5v-3h4v3" />
    </svg>
  );
}

function IconComplement({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5.5" r="3.5" />
      <circle cx="10.5" cy="10.5" r="3.5" />
      <path d="M8 5.5h4.5M10.5 3v5" />
    </svg>
  );
}

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
    </svg>
  );
}
