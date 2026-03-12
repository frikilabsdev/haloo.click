import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

// ── Esquema ───────────────────────────────────────────────────────────────────

const CreateOptionSchema = z.object({
  groupId:     z.string().min(1, "El grupo es requerido"),
  name:        z.string().min(1, "El nombre es requerido").max(80),
  description: z.string().max(300).nullish(),
  price:       z.number().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
});

// ── POST /api/menu/options ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Sin restaurante asociado." }, { status: 403 });
    }

    await assertTenantAccess(session.user.id, tenantId);

    const body = await request.json();
    const parsed = CreateOptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verificar que el grupo pertenece al tenant
    const group = await prisma.optionGroup.findUnique({
      where:  { id: parsed.data.groupId },
      select: { tenantId: true },
    });
    if (!group || group.tenantId !== tenantId) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    const lastOption = await prisma.option.findFirst({
      where:   { optionGroupId: parsed.data.groupId },
      orderBy: { position: "desc" },
      select:  { position: true },
    });
    const position = (lastOption?.position ?? -1) + 1;

    const option = await prisma.option.create({
      data: {
        optionGroupId: parsed.data.groupId,
        name:          parsed.data.name,
        description:   parsed.data.description ?? null,
        price:         new Prisma.Decimal(parsed.data.price ?? 0),
        isAvailable:   parsed.data.isAvailable ?? true,
        position,
      },
    });

    return NextResponse.json({ data: option }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/options POST]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
