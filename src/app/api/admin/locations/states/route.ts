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

// GET /api/admin/locations/states — lista todos los estados
export async function GET() {
  try {
    const { error: _authErr } = await requireAdminApi(); if (_authErr) return _authErr;
    const states = await prisma.state.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { cities: true, tenants: true } } },
    });
    return NextResponse.json({ data: states });
  } catch (error) {
    console.error("[admin/locations/states GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// POST /api/admin/locations/states — crear estado
export async function POST(request: NextRequest) {
  try {
    const { error: _authErr } = await requireAdminApi(); if (_authErr) return _authErr;
    const { name, order } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido." }, { status: 400 });
    }
    const slug = toSlug(name.trim());
    const state = await prisma.state.create({
      data: { name: name.trim(), slug, order: order ?? 0 },
    });
    return NextResponse.json({ data: state }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un estado con ese nombre." }, { status: 409 });
    }
    console.error("[admin/locations/states POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
