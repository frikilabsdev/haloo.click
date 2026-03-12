import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { PendienteCard } from "./_components/PendienteCard";

export default async function PendientePage() {
  const session = await auth();

  let tenantName: string | null = null;
  if (session?.user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    });
    tenantName = tenant?.name ?? null;
  }

  return <PendienteCard name={tenantName} adminWa={env.ADMIN_WHATSAPP} />;
}
