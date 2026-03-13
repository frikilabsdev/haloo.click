"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AdminHeader() {
  return (
    <header className="admin-header" style={{
      background: "#1E293B", borderBottom: "1px solid #334155",
      padding: "0 24px", height: 56,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <style>{`
        @media (max-width: 767px) {
          .admin-header {
            padding: 0 12px !important;
            height: 58px !important;
          }

          .admin-header .admin-divider,
          .admin-header .admin-role {
            display: none;
          }

          .admin-header .admin-actions {
            gap: 8px !important;
          }

          .admin-header .admin-dashboard-link {
            font-size: 12px !important;
            padding: 6px 10px;
            border-radius: 8px;
            background: rgba(148,163,184,0.12);
          }

          .admin-header .admin-logout-btn {
            min-height: 38px;
            padding: 0 12px !important;
          }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-syne)", fontWeight: 800, fontSize: 18, color: "#F4721E" }}>
          haloo
        </span>
        <span className="admin-divider" style={{ color: "#475569", fontSize: 14 }}>/</span>
        <span className="admin-role" style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Admin
        </span>
      </div>
      <div className="admin-actions" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard" className="admin-dashboard-link" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none", whiteSpace: "nowrap" }}>
          ← Mi dashboard
        </Link>
        <button
          className="admin-logout-btn"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            fontSize: 13, fontWeight: 600, color: "#F87171",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer",
            fontFamily: "var(--font-dm)",
            whiteSpace: "nowrap",
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}
