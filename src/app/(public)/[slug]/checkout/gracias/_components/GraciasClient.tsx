"use client";

// Esta página es un fallback legacy.
// El flujo principal ahora va a /{slug}/pedido/{orderId}
// Si alguien llega aquí con sessionStorage (flujo anterior) o localStorage, lo redirigimos.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function GraciasClient({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    // Intentar redirigir al pedido desde localStorage (flujo nuevo)
    try {
      const raw = localStorage.getItem(`haloo_last_order_${slug}`);
      if (raw) {
        const { orderId, ts } = JSON.parse(raw);
        // Solo redirigir si el pedido es de las últimas 24h
        if (orderId && Date.now() - ts < 86_400_000) {
          router.replace(`/${slug}/pedido/${orderId}`);
          return;
        }
      }
    } catch { /* */ }

    // Fallback: redirigir al menú
    router.replace(`/${slug}`);
  }, [slug, router]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, background: "var(--menu-bg)" }}>
      <p style={{ fontFamily: "var(--font-dm)", color: "var(--menu-muted)" }}>Redirigiendo…</p>
      <Link href={`/${slug}`} style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--menu-accent)", textDecoration: "none" }}>
        ← Volver al menú
      </Link>
    </div>
  );
}
