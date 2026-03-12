// ── CÓDIGO INACTIVO — ver CLEANUP_LOG.md ──────────────────────────────────────
// Integración con Supabase Auth reemplazada por NextAuth v5 + credentials + bcrypt.
// Solo era importado por src/app/api/auth/callback/route.ts (también inactivo).
// Comentado: 2026-03-11
//
// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
//
// export async function createClient() {
//   const cookieStore = await cookies();
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() { return cookieStore.getAll(); },
//         setAll(cookiesToSet) {
//           try {
//             cookiesToSet.forEach(({ name, value, options }) =>
//               cookieStore.set(name, value, options)
//             );
//           } catch {
//             // Server Component: ignorar si no se pueden setear cookies
//           }
//         },
//       },
//     }
//   );
// }
//
// // Cliente con service role (solo para operaciones de admin server-side)
// export function createAdminClient() {
//   const { createClient } = require("@supabase/supabase-js");
//   return createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { autoRefreshToken: false, persistSession: false } }
//   );
// }
