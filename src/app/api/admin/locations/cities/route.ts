import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// GET /api/admin/locations/cities?stateId=xxx — ciudades de un estado
export async function GET(request: NextRequest) {
  try {
    const { error: _authErr } = await requireAdminApi(); if (_authErr) return _authErr;
    const stateId = request.nextUrl.searchParams.get("stateId");
    if (!stateId) {
      return NextResponse.json({ error: "stateId requerido." }, { status: 400 });
    }
    const cities = await prisma.city.findMany({
      where: { stateId },
      orderBy: { name: "asc" },
      include: { _count: { select: { tenants: true } } },
    });
    return NextResponse.json({ data: cities });
  } catch (error) {
    console.error("[admin/locations/cities GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// POST /api/admin/locations/cities — crear ciudad
export async function POST(request: NextRequest) {
  try {
    const { error: _authErr } = await requireAdminApi(); if (_authErr) return _authErr;
    const { name, stateId } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
    }
    if (!stateId) {
      return NextResponse.json({ error: "stateId requerido." }, { status: 400 });
    }
    const slug = toSlug(name.trim());
    const city = await prisma.city.create({
      data: { name: name.trim(), slug, stateId },
    });
    return NextResponse.json({ data: city }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe una ciudad con ese nombre en este estado." }, { status: 409 });
    }
    console.error("[admin/locations/cities POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
