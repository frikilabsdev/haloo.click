import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/locations                → lista de estados activos
// GET /api/locations?stateId=xxx    → ciudades activas de ese estado

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const stateId = searchParams.get("stateId");

    if (stateId) {
      const cities = await prisma.city.findMany({
        where: { stateId, isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ data: cities }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      });
    }

    const states = await prisma.state.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ data: states }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[locations/GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
