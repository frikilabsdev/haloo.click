import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertTenantAccess } from "@/lib/tenant";

// ── Esquemas ──────────────────────────────────────────────────────────────────

const CreateGroupSchema = z.object({
  name:         z.string().min(1, "El nombre es requerido").max(80),
  internalName: z.string().max(120).nullable().optional(),
  description:  z.string().max(300).optional(),
  isVariant:    z.boolean().optional(),
  required:     z.boolean().optional(),
  multiple:     z.boolean().optional(),
  min:          z.number().int().min(0).optional(),
  max:          z.number().int().min(1).nullable().optional(),
});

// ── GET /api/menu/groups — lista todos los complementos del tenant ─────────────

export async function GET(_request: NextRequest) {
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

    const groups = await prisma.optionGroup.findMany({
      where:   { tenantId },
      orderBy: { position: "asc" },
      include: {
        options: { orderBy: { position: "asc" } },
        complements: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ data: groups });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/groups GET]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// ── POST /api/menu/groups — crea un complemento en la biblioteca del tenant ───

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
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const lastGroup = await prisma.optionGroup.findFirst({
      where:   { tenantId },
      orderBy: { position: "desc" },
      select:  { position: true },
    });
    const position = (lastGroup?.position ?? -1) + 1;

    const { min, max, isVariant, ...rest } = parsed.data;
    const iv = isVariant ?? false;

    const group = await prisma.optionGroup.create({
      data: {
        tenantId,
        name:         rest.name,
        internalName: rest.internalName ?? null,
        description:  rest.description ?? null,
        isVariant:    iv,
        // isVariant fuerza: obligatorio, una sola selección
        required:     iv ? true  : (rest.required ?? (min !== undefined && min > 0)),
        multiple:     iv ? false : (rest.multiple ?? (max === null || (max !== undefined && max > 1))),
        min:          iv ? 1     : (min ?? 0),
        max:          iv ? 1     : (max ?? null),
        position,
      },
      include: {
        options:     { orderBy: { position: "asc" } },
        complements: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/groups POST]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
