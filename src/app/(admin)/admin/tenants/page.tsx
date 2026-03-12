import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TenantsClient } from "./_components/TenantsClient";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireAdmin();

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id:             true,
      slug:           true,
      name:           true,
      type:           true,
      city:           true,
      status:         true,
      plan:           true,
      whatsappNumber: true,
      createdAt:      true,
      users: {
        select: {
          user:  { select: { email: true, name: true } },
          role:  true,
        },
        take: 1,
      },
      _count: { select: { orders: true, products: true } },
    },
  });

  const serialized = JSON.parse(JSON.stringify(tenants));
  return <TenantsClient initialTenants={serialized} />;
}
