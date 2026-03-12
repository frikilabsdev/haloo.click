import { requireSession } from "@/lib/session";
import { getTenantByUserId } from "@/lib/tenant";
import { DashboardShell } from "./_components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);
  const serialized = JSON.parse(JSON.stringify(tenant));

  return (
    <DashboardShell tenant={serialized} userRole={session.user.role ?? "STAFF"} isAdmin={session.user.isAdmin ?? false}>
      {children}
    </DashboardShell>
  );
}
