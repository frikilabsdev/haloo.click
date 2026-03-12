import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { AdminHeader } from "./_components/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div style={{ minHeight: "100dvh", background: "#0F172A", color: "#F8FAFC", fontFamily: "var(--font-dm)" }}>
      <style>{`
        :root {
          --admin-bg:      #0F172A;
          --admin-surface: #1E293B;
          --admin-border:  #334155;
          --admin-muted:   #94A3B8;
          --admin-text:    #F8FAFC;
          --admin-accent:  #F4721E;
        }
      `}</style>

      <AdminHeader />

      {/* Nav */}
      <nav style={{ background: "#1E293B", borderBottom: "1px solid #334155", padding: "0 24px", display: "flex", gap: 4 }}>
        <Link href="/admin/tenants"
          style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#CBD5E1", textDecoration: "none" }}>
          Restaurantes
        </Link>
        <Link href="/admin/locations"
          style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#CBD5E1", textDecoration: "none" }}>
          Ubicaciones
        </Link>
      </nav>

      <main style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
