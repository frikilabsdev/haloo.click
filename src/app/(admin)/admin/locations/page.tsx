import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LocationsClient } from "./_components/LocationsClient";

export const metadata = { title: "Ubicaciones — Admin Haloo" };

export default async function LocationsPage() {
  await requireAdmin();

  const states = await prisma.state.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      cities:  { orderBy: { name: "asc" } },
      _count:  { select: { tenants: true } },
    },
  });

  return <LocationsClient initialStates={JSON.parse(JSON.stringify(states))} />;
}
