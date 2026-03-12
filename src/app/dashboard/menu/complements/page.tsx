import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ComplementsManager } from "./_components/ComplementsManager";

export default async function ComplementsPage() {
  const session = await requireSession();
  const tenantId = session.user!.tenantId!;

  const groups = await prisma.optionGroup.findMany({
    where:   { tenantId },
    orderBy: { position: "asc" },
    include: {
      options:     { orderBy: { position: "asc" } },
      complements: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  const serialized = JSON.parse(JSON.stringify(groups));
  return <ComplementsManager initialGroups={serialized} />;
}
