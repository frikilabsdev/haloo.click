import { auth } from "@/auth";
import { NextResponse } from "next/server";

// ── Headers de seguridad aplicados a todas las respuestas ─────────────────────
// CSP nota: Next.js 16 requiere 'unsafe-inline' sin sistema de nonces.
// Para mayor seguridad en producción, considerar implementar nonces.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options":           "DENY",
  "X-Content-Type-Options":    "nosniff",
  "X-DNS-Prefetch-Control":    "on",
  "Referrer-Policy":           "strict-origin-when-cross-origin",
  "Permissions-Policy":        "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    // Next.js necesita unsafe-inline/unsafe-eval sin nonces configurados
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    // Cloudinary para imágenes de productos, OpenStreetMap para tiles del mapa
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org",
    // Nominatim: reverse geocoding desde el browser (MapPicker)
    "connect-src 'self' https://nominatim.openstreetmap.org",
    "font-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const session     = req.auth;
  const isLoggedIn  = !!session;

  // ── Rutas protegidas del dashboard ─────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Tenant pendiente de aprobación
    if (session?.user.tenantStatus === "PENDING" && !session?.user.isAdmin) {
      return NextResponse.redirect(new URL("/pendiente", nextUrl));
    }
    // Tenant suspendido no puede acceder al dashboard
    if (session?.user.tenantStatus === "SUSPENDED" && !session?.user.isAdmin) {
      return NextResponse.redirect(new URL("/pendiente", nextUrl));
    }
  }

  // ── Rutas del super admin ──────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn || !session?.user.isAdmin) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  // ── Si ya está logueado no puede ir a login/register ──────────────────────
  if (pathname === "/login" || pathname === "/register") {
    if (isLoggedIn) {
      const dest = session?.user.isAdmin ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, nextUrl));
    }
  }

  const response = NextResponse.next();

  // Aplicar headers de seguridad a todas las respuestas
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
