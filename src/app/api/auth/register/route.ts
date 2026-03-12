import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isValidSlug } from "@/lib/utils";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { validateOrigin } from "@/lib/csrf";

const RegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  restaurantName: z.string().min(2, "Nombre demasiado corto").max(100),
  type: z.string().min(1, "Selecciona el tipo de restaurante"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(60, "El slug es demasiado largo")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "URL inválida: solo letras, números y guiones"),
  whatsapp: z
    .string()
    .min(10, "Número de WhatsApp inválido")
    .regex(/^\+?[0-9\s\-().]+$/, "Número de WhatsApp inválido"),
});

export async function POST(request: NextRequest) {
  try {
    // ── Protección CSRF ──────────────────────────────────────────────────────
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Solicitud no autorizada." }, { status: 403 });
    }

    // ── Rate limiting: 5 registros por IP por hora ───────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos de registro. Espera un momento." },
        {
          status: 429,
          headers: {
            "Retry-After":          String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, restaurantName, type, slug, whatsapp } = parsed.data;

    // Validación extra del slug (doble capa de seguridad)
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "La URL contiene caracteres no permitidos." },
        { status: 400 }
      );
    }

    const [existingTenant, existingUser] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingTenant) {
      return NextResponse.json(
        { error: "Esa URL ya está en uso. Elige otra para tu restaurante." },
        { status: 409 }
      );
    }
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo electrónico." },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: restaurantName,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: restaurantName,
          type,
          phone: whatsapp,
          whatsappNumber: whatsapp,
          status: "PENDING",
        },
      });

      await tx.tenantUser.create({
        data: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
      });

      await tx.paymentConfig.create({
        data: { tenantId: tenant.id, cashEnabled: true },
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
