import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTenantByUserId } from "@/lib/tenant";
import { ConfigManager } from "./_components/ConfigManager";

export default async function ConfiguracionPage() {
  const session  = await requireSession();
  const tenant   = await getTenantByUserId(session.user.id);

  // Para la sección de zonas necesitamos TODAS (incluso inactivas)
  const allZones = await prisma.deliveryZone.findMany({
    where:   { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  const serialized = JSON.parse(JSON.stringify({ tenant, zones: allZones }));

  return (
    <ConfigManager
      initialTenant={serialized.tenant}
      initialZones={serialized.zones}
    />
  );
}
