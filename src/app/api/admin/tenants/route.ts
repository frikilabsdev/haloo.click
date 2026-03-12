import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// ── GET /api/admin/tenants — lista todos los tenants ─────────────────────────

export async function GET() {
  try {
    const { error } = await requireAdminApi();
    if (error) return error;

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:          true,
        slug:        true,
        name:        true,
        type:        true,
        city:  { select: { name: true } },
        state: { select: { name: true } },
        status:      true,
        plan:        true,
        whatsappNumber: true,
        createdAt:   true,
        users: {
          select: {
            user: { select: { email: true, name: true } },
            role: true,
          },
          take: 1,
        },
        _count: {
          select: { orders: true, products: true },
        },
      },
    });

    return NextResponse.json({ data: JSON.parse(JSON.stringify(tenants)) });
  } catch (e) {
    console.error("[admin/tenants GET]", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
