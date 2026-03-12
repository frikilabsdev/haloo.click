import { requireSession } from "@/lib/session";
import { getTenantByUserId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { MenuManager } from "./_components/MenuManager";

export default async function MenuPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  const categories = await prisma.category.findMany({
    where:   { tenantId: tenant.id },
    orderBy: { position: "asc" },
    include: {
      products: {
        orderBy: { position: "asc" },
        select: {
          id:          true,
          name:        true,
          basePrice:   true,
          isActive:    true,
          isAvailable: true,
          images:      { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        },
      },
    },
  });

  // Serializar Decimals de Prisma antes de pasar a Client Component
  const serialized = JSON.parse(JSON.stringify(categories));

  return (
    <MenuManager
      initialCategories={serialized}
      tenantSlug={tenant.slug}
    />
  );
}
