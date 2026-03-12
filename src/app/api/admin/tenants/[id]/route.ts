import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  plan:   z.enum(["BASIC", "PRO"]).optional(),
});

// ── PATCH /api/admin/tenants/[id] ─────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdminApi();
    if (error) return error;
    const { id } = await params;

    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data:  parsed.data,
      select: { id: true, status: true, plan: true },
    });

    return NextResponse.json({ data: tenant });
  } catch (e) {
    console.error("[admin/tenants PATCH]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// ── DELETE /api/admin/tenants/[id] ────────────────────────────────────────────
// Elimina el tenant y al usuario dueño (owner) completamente de la DB.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdminApi();
    if (error) return error;
    const { id } = await params;

    // Obtener el userId del owner antes de borrar
    const ownerRelation = await prisma.tenantUser.findFirst({
      where: { tenantId: id, role: "OWNER" },
      select: { userId: true },
    });

    // Borrar el tenant (cascade borra todo lo relacionado por onDelete: Cascade)
    await prisma.tenant.delete({ where: { id } });

    // Si el owner no tiene otros tenants, eliminarlo también
    if (ownerRelation) {
      const otherTenants = await prisma.tenantUser.count({
        where: { userId: ownerRelation.userId },
      });
      if (otherTenants === 0) {
        await prisma.user.delete({ where: { id: ownerRelation.userId } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/tenants DELETE]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
