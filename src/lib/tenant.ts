import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { TenantWithRelations } from "@/types";

/**
 * Resuelve el tenant por slug.
 * Si no existe o no está ACTIVE, retorna 404.
 * Úsalo en Server Components del menú público.
 */
export async function getTenantBySlug(slug: string): Promise<TenantWithRelations> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      paymentConfig: true,
      schedules: { orderBy: { dayOfWeek: "asc" } },
      deliveryZones: { where: { isActive: true }, orderBy: { name: "asc" } },
      branches: { where: { isActive: true } },
      state: true,
      city:  true,
    },
  });

  if (!tenant) notFound();

  return tenant;
}

/**
 * Resuelve el tenant al que pertenece el usuario autenticado.
 * Úsalo en Server Components del dashboard.
 * Garantiza que el userId solo pueda acceder a SU tenant.
 */
export async function getTenantByUserId(userId: string): Promise<TenantWithRelations> {
  const tenantUser = await prisma.tenantUser.findFirst({
    where: { userId },
    include: {
      tenant: {
        include: {
          paymentConfig: true,
          schedules: { orderBy: { dayOfWeek: "asc" } },
          deliveryZones: { where: { isActive: true }, orderBy: { name: "asc" } },
          branches: { where: { isActive: true } },
          state: true,
          city:  true,
        },
      },
    },
  });

  if (!tenantUser) notFound();

  return tenantUser.tenant;
}

/**
 * Verifica que userId pertenece al tenant con tenantId dado.
 * Usa esto en API routes antes de hacer cualquier mutación.
 */
export async function assertTenantAccess(userId: string, tenantId: string) {
  const access = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });

  if (!access) {
    throw new Error("UNAUTHORIZED");
  }

  return access;
}
