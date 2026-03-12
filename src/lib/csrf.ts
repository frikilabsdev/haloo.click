import { NextRequest } from "next/server";

/**
 * Valida que la solicitud proviene del mismo origen (protección CSRF).
 * Solo aplica a métodos mutantes (POST, PATCH, PUT, DELETE).
 *
 * NextAuth v5 usa SameSite=Lax por defecto, pero esta capa extra protege
 * endpoints de API JSON frente a ataques cross-site.
 *
 * Requiere APP_URL o NEXTAUTH_URL en .env para funcionar en producción.
 */
export function validateOrigin(request: NextRequest): boolean {
  const method = request.method;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  // En desarrollo, si no hay APP_URL configurada, omitir la validación
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
  if (!appUrl) return true;

  let appOrigin: string;
  try {
    appOrigin = new URL(appUrl).origin;
  } catch {
    return true;
  }

  const origin = request.headers.get("origin");
  if (origin) return origin === appOrigin;

  // Sin Origin, verificar Referer como fallback
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === appOrigin;
    } catch {
      return false;
    }
  }

  // Sin Origin ni Referer: permitir solo en desarrollo
  return process.env.NODE_ENV === "development";
}
