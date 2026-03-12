import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * Obtiene la sesión del usuario autenticado en Server Components.
 * Redirige a /login si no hay sesión.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Obtiene la sesión del super admin en Server Components (páginas).
 * Redirige si no es admin.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/login");
  return session;
}

/**
 * Verifica acceso de admin en API Routes.
 * Retorna { error } para devolver directamente, o { error: null } si está autorizado.
 */
export async function requireAdminApi(): Promise<{ error: NextResponse | null }> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  }
  if (!session.user.isAdmin) {
    return { error: NextResponse.json({ error: "Acceso denegado." }, { status: 403 }) };
  }
  return { error: null };
}
