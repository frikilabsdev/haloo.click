import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

const EXPIRY_MS = 60 * 60 * 1000; // 1 hora

async function sendResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM ?? "Haloo <noreply@haloo.click>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Recupera tu contraseña — Haloo",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#0C0B09;color:#F0EDE8;border-radius:16px;">
          <h1 style="font-size:24px;margin:0 0 8px;color:#F4721E;">Haloo</h1>
          <h2 style="font-size:18px;font-weight:600;margin:0 0 24px;color:#F0EDE8;">Recupera tu contraseña</h2>
          <p style="font-size:14px;color:#8A8070;line-height:1.6;margin:0 0 32px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Haz clic en el botón para continuar. El enlace expira en <strong style="color:#F0EDE8;">1 hora</strong>.
          </p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F4721E,#E05A10);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
            Restablecer contraseña
          </a>
          <p style="font-size:12px;color:#8A8070;margin:32px 0 0;line-height:1.5;">
            Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.<br/>
            <a href="${resetUrl}" style="color:#8A8070;word-break:break-all;">${resetUrl}</a>
          </p>
        </div>
      `,
    }),
  });

  return res.ok;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting: 5 solicitudes por IP por hora ─────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento antes de intentarlo de nuevo." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting adicional por email (evita DDoS a un correo específico)
    const rlEmail = rateLimit(`forgot-password:email:${normalizedEmail}`, 3, 60 * 60 * 1000);
    if (!rlEmail.success) {
      // Responder con éxito para no confirmar que el email existe
      return NextResponse.json({ ok: true });
    }

    // Siempre responder con éxito para no revelar si el email existe
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Invalidar tokens previos no usados
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + EXPIRY_MS);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password/${token}`;

      const sent = await sendResetEmail(normalizedEmail, resetUrl);

      if (!sent) {
        // Desarrollo: imprimir enlace en consola
        console.log(`[forgot-password] Enlace de recuperación (dev): ${resetUrl}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
