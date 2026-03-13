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

        .admin-nav {
          background: #1E293B;
          border-bottom: 1px solid #334155;
          padding: 0 24px;
          display: flex;
          gap: 4px;
        }

        .admin-nav-link {
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #CBD5E1;
          text-decoration: none;
          border-radius: 8px 8px 0 0;
          white-space: nowrap;
        }

        .admin-main {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 767px) {
          .admin-nav {
            padding: 0 12px;
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .admin-nav::-webkit-scrollbar {
            display: none;
          }

          .admin-nav-link {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            padding: 0 14px;
            font-size: 13px;
          }

          .admin-main {
            padding: 14px 12px 24px;
          }
        }
      `}</style>

      <AdminHeader />

      {/* Nav */}
      <nav className="admin-nav">
        <Link href="/admin/tenants"
          className="admin-nav-link">
          Restaurantes
        </Link>
        <Link href="/admin/locations"
          className="admin-nav-link">
          Ubicaciones
        </Link>
      </nav>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
