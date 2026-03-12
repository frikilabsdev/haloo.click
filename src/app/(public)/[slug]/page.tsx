import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { MenuClient } from "./_components/MenuClient";
import { SuspendedCard } from "./_components/SuspendedCard";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Buscar tenant sin filtrar por status (para poder mostrar tarjeta suspendido)
  const tenantRaw = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      paymentConfig: true,
      schedules: { orderBy: { dayOfWeek: "asc" } },
      deliveryZones: { where: { isActive: true }, orderBy: { name: "asc" } },
      branches: { where: { isActive: true } },
      state: true,
      city:  true,
    },
  });

  if (!tenantRaw) notFound();

  if (tenantRaw.status === "SUSPENDED" || tenantRaw.status === "PENDING") {
    const session = await auth();
    const isOwner = session?.user?.tenantSlug === slug;
    return <SuspendedCard name={tenantRaw.name} isOwner={isOwner} />;
  }

  const tenant = tenantRaw;

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, isActive: true },
    include: {
      products: {
        where: { isActive: true },
        include: {
          images:   { orderBy: { position: "asc" } },
          variants: { where: { isAvailable: true }, orderBy: { position: "asc" } },
          complements: {
            orderBy: { position: "asc" },
            include: {
              optionGroup: {
                include: {
                  options: { where: { isAvailable: true }, orderBy: { position: "asc" } },
                },
              },
            },
          },
          suggestions: {
            orderBy: { position: "asc" },
            select: {
              suggestedProduct: {
                select: {
                  id:        true,
                  name:      true,
                  basePrice: true,
                  isActive:  true,
                  images:    { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
                  variants:  { select: { id: true, name: true, price: true }, where: { isAvailable: true }, orderBy: { position: "asc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });

  // Aplanar complements → optionGroups; aplanar suggestions → SuggestedProduct[]
  const categoriesFlat = categories.map(cat => ({
    ...cat,
    products: cat.products.map(({ complements, suggestions, ...product }) => ({
      ...product,
      optionGroups: complements.map(c => c.optionGroup),
      suggestions:  suggestions.map(s => s.suggestedProduct),
    })),
  }));

  // Prisma Decimal → string via JSON round-trip
  const serialized = JSON.parse(JSON.stringify({ tenant, categories: categoriesFlat }));

  return <MenuClient tenant={serialized.tenant} categories={serialized.categories} />;
}
