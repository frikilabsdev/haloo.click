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

// PATCH /api/admin/locations/states/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: _authErr } = await requireAdminApi(); if (_authErr) return _authErr;
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined)     { data.name = body.name.trim(); data.slug = toSlug(body.name.trim()); }
    if (body.order !== undefined)    data.order    = body.order;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const state = await prisma.state.update({ where: { id }, data });
    return NextResponse.json({ data: state });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un estado con ese nombre." }, { status: 409 });
    }
    console.error("[admin/locations/states PATCH]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// DELETE /api/admin/locations/states/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: _authErr } = await requireAdminApi(); if (_authErr) return _authErr;
    const { id } = await params;
    await prisma.state.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/locations/states DELETE]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
