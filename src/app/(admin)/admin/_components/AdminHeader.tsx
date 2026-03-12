"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AdminHeader() {
  return (
    <header style={{
      background: "#1E293B", borderBottom: "1px solid #334155",
      padding: "0 24px", height: 56,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: "var(--font-syne)", fontWeight: 800, fontSize: 18, color: "#F4721E" }}>
          haloo
        </span>
        <span style={{ color: "#475569", fontSize: 14 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Admin
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>
          ← Mi dashboard
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            fontSize: 13, fontWeight: 600, color: "#F87171",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer",
            fontFamily: "var(--font-dm)",
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}
