"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0C0B09", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "sans-serif" }}>
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "48px 40px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          textAlign: "center",
        }}>
          {/* Glow de fondo */}
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: 20,
            background: "radial-gradient(ellipse at 50% 0%, rgba(244,114,30,0.12) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />

          {/* Icono */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(244,114,30,0.1)",
            border: "1px solid rgba(244,114,30,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F4721E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          {/* Logo */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 20,
          }}>
            <span style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#F4721E",
              boxShadow: "0 0 12px #F4721E",
            }} />
            <span style={{ color: "#F0EDE8", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Haloo</span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#F0EDE8", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: 14, color: "#8A8070", lineHeight: 1.7, margin: "0 0 36px" }}>
            Ocurrió un error inesperado. Nuestro equipo fue notificado.
            {error.digest && (
              <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "#5A5040" }}>
                Código: {error.digest}
              </span>
            )}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                padding: "14px 24px",
                background: "linear-gradient(135deg, #F4721E, #E05A10)",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                cursor: "pointer",
                letterSpacing: "0.02em",
                boxShadow: "0 4px 24px rgba(244,114,30,0.35)",
              }}
            >
              Intentar de nuevo
            </button>
            <Link href="/" style={{
              padding: "14px 24px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              fontSize: 14,
              color: "#8A8070",
              textDecoration: "none",
              display: "block",
            }}>
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
