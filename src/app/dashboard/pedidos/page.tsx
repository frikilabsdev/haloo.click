import { requireSession } from "@/lib/session";
import { getTenantByUserId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PedidosClient } from "./_components/PedidosClient";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  const orders = await prisma.order.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
      deliveryZone: { select: { name: true } },
    },
  });

  const serialized = JSON.parse(JSON.stringify(orders));

  return <PedidosClient initialOrders={serialized} />;
}
