import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting: 10 intentos por IP por hora (anti brute-force de tokens) ─
    const ip = getClientIp(request);
    const rl = rateLimit(`reset-password:${ip}`, 10, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record) {
      return NextResponse.json({ error: "Enlace inválido o ya utilizado." }, { status: 400 });
    }
    if (record.usedAt) {
      return NextResponse.json({ error: "Este enlace ya fue utilizado." }, { status: 400 });
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
