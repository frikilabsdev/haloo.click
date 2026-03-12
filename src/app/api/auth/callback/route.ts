// ── CÓDIGO INACTIVO — ver CLEANUP_LOG.md ──────────────────────────────────────
// Callback OAuth de Supabase Auth. El proyecto usa NextAuth v5 con credentials,
// no hay flujo OAuth activo. Esta ruta nunca es llamada.
// Comentado: 2026-03-11

import { NextResponse } from "next/server";

export async function GET() {
  // Esta ruta existía para el flujo OAuth de Supabase (reemplazado por NextAuth v5).
  return NextResponse.json({ error: "Not implemented." }, { status: 410 });
}

// ── Código original comentado ─────────────────────────────────────────────────
// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
//
// export async function GET(request: NextRequest) {
//   const { searchParams, origin } = new URL(request.url);
//   const code = searchParams.get("code");
//   const next = searchParams.get("next") ?? "/dashboard";
//
//   if (code) {
//     const supabase = await createClient();
//     const { error } = await supabase.auth.exchangeCodeForSession(code);
//     if (!error) {
//       return NextResponse.redirect(`${origin}${next}`);
//     }
//   }
//
//   return NextResponse.redirect(`${origin}/login?error=auth`);
// }
