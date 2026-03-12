"use client";

import { useState } from "react";
import Link from "next/link";

const LABEL_STYLE = {
  display: "block",
  fontFamily: "var(--font-dm)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--ember-muted)",
  marginBottom: 10,
};

const INPUT_STYLE_BASE = {
  width: "100%",
  background: "transparent",
  border: "none",
  padding: "12px 0",
  fontFamily: "var(--font-lora)",
  fontSize: 16,
  color: "var(--ember-text)",
  outline: "none",
  transition: "border-color 0.2s",
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al procesar la solicitud.");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grain" style={{ minHeight: "100vh", background: "var(--ember-bg)", display: "flex" }}>

      {/* Panel izquierdo */}
      <div style={{
        width: "45%",
        background: "linear-gradient(160deg, #1A1410 0%, #0C0B09 60%)",
        padding: "60px 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }} className="hidden lg:flex">

        <div style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,114,30,0.18) 0%, transparent 70%)",
          bottom: -80,
          left: -60,
          pointerEvents: "none",
        }} />

        <svg style={{ position: "absolute", top: 80, right: -40, opacity: 0.07 }}
          width="300" height="300" viewBox="0 0 300 300" fill="none">
          <circle cx="150" cy="150" r="140" stroke="#F4721E" strokeWidth="1" />
          <circle cx="150" cy="150" r="100" stroke="#F4721E" strokeWidth="1" />
          <circle cx="150" cy="150" r="60" stroke="#F4721E" strokeWidth="1" />
          <line x1="10" y1="150" x2="290" y2="150" stroke="#F4721E" strokeWidth="1" />
          <line x1="150" y1="10" x2="150" y2="290" stroke="#F4721E" strokeWidth="1" />
          <line x1="51" y1="51" x2="249" y2="249" stroke="#F4721E" strokeWidth="1" />
          <line x1="249" y1="51" x2="51" y2="249" stroke="#F4721E" strokeWidth="1" />
        </svg>

        <div>
          <div style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 800,
            fontSize: 28,
            color: "var(--ember-text)",
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--ember-orange)",
              boxShadow: "0 0 16px var(--ember-orange)",
            }} />
            Haloo
          </div>
        </div>

        <div>
          <p style={{
            fontFamily: "var(--font-lora)",
            fontStyle: "italic",
            fontSize: 42,
            lineHeight: 1.2,
            color: "var(--ember-text)",
            margin: "0 0 24px",
            opacity: 0.9,
          }}>
            Recupera<br />
            <span style={{ color: "var(--ember-orange)" }}>el acceso</span><br />
            a tu panel.
          </p>
          <p style={{
            fontFamily: "var(--font-dm)",
            fontSize: 14,
            color: "var(--ember-muted)",
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Te enviaremos un enlace seguro para restablecer tu contraseña.
          </p>
        </div>

        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--ember-muted)" }}>
          © 2026 Haloo · haloo.click
        </p>
      </div>

      {/* Panel derecho */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--ember-bg)",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <div className="lg:hidden" style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 800,
            fontSize: 24,
            color: "var(--ember-text)",
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--ember-orange)",
              boxShadow: "0 0 12px var(--ember-orange)",
            }} />
            Haloo
          </div>

          {sent ? (
            /* ── Estado: correo enviado ── */
            <div>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(244,114,30,0.12)",
                border: "1px solid rgba(244,114,30,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 28,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F4721E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>

              <h1 style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 700,
                fontSize: 28,
                color: "var(--ember-text)",
                margin: "0 0 12px",
                letterSpacing: "-0.02em",
              }}>
                Revisa tu correo
              </h1>
              <p style={{
                fontFamily: "var(--font-dm)",
                fontSize: 14,
                color: "var(--ember-muted)",
                lineHeight: 1.7,
                margin: "0 0 32px",
              }}>
                Si <strong style={{ color: "var(--ember-text)" }}>{email}</strong> está registrado en Haloo,
                recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>

              <div style={{
                background: "rgba(244,114,30,0.06)",
                border: "1px solid rgba(244,114,30,0.15)",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 32,
              }}>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--ember-muted)", margin: 0, lineHeight: 1.6 }}>
                  ¿No llega? Revisa tu carpeta de spam o{" "}
                  <a
                    href="https://wa.me/529711260809?text=Hola,%20necesito%20ayuda%20para%20recuperar%20el%20acceso%20a%20mi%20cuenta%20de%20Haloo."
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#25D366", fontWeight: 600, textDecoration: "none" }}
                  >
                    contáctanos por WhatsApp
                  </a>
                  .
                </p>
              </div>

              <Link href="/login" style={{
                display: "block",
                textAlign: "center",
                fontFamily: "var(--font-dm)",
                fontSize: 13,
                color: "var(--ember-muted)",
                textDecoration: "none",
              }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* ── Formulario ── */
            <div>
              <h1 style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 700,
                fontSize: 32,
                color: "var(--ember-text)",
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}>
                Olvidé mi contraseña
              </h1>
              <p style={{
                fontFamily: "var(--font-dm)",
                fontSize: 14,
                color: "var(--ember-muted)",
                margin: "0 0 44px",
                lineHeight: 1.6,
              }}>
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 40 }}>
                  <label style={LABEL_STYLE}>Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    style={{
                      ...INPUT_STYLE_BASE,
                      borderBottom: `1px solid ${email ? "var(--ember-orange)" : "var(--ember-border)"}`,
                    }}
                    onFocus={e => e.currentTarget.style.borderBottomColor = "var(--ember-orange)"}
                    onBlur={e => e.currentTarget.style.borderBottomColor = email ? "var(--ember-orange)" : "var(--ember-border)"}
                  />
                </div>

                {error && (
                  <div style={{
                    background: "rgba(244,114,30,0.1)",
                    border: "1px solid rgba(244,114,30,0.3)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginBottom: 24,
                    fontFamily: "var(--font-dm)",
                    fontSize: 13,
                    color: "var(--ember-orange)",
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: loading
                      ? "var(--ember-border)"
                      : "linear-gradient(135deg, #F4721E 0%, #E05A10 100%)",
                    border: "none",
                    borderRadius: 10,
                    fontFamily: "var(--font-syne)",
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "0.02em",
                    color: loading ? "var(--ember-muted)" : "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: loading ? "none" : "0 4px 24px rgba(244,114,30,0.35)",
                  }}
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación →"}
                </button>
              </form>

              <p style={{
                fontFamily: "var(--font-dm)",
                fontSize: 13,
                color: "var(--ember-muted)",
                marginTop: 32,
                textAlign: "center",
              }}>
                <Link href="/login" style={{ color: "var(--ember-gold)", textDecoration: "none", fontWeight: 500 }}>
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
