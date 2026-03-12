"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordsMatch = !confirm || password === confirm;
  const isStrong = password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!isStrong) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al restablecer la contraseña.");
      }

      setDone(true);
      setTimeout(() => router.replace("/login"), 3000);
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
            Nueva<br />
            <span style={{ color: "var(--ember-orange)" }}>contraseña</span><br />
            segura.
          </p>
          <p style={{
            fontFamily: "var(--font-dm)",
            fontSize: 14,
            color: "var(--ember-muted)",
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Elige una contraseña robusta de al menos 8 caracteres.
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

          {done ? (
            /* ── Éxito ── */
            <div>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 28,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
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
                ¡Contraseña actualizada!
              </h1>
              <p style={{
                fontFamily: "var(--font-dm)",
                fontSize: 14,
                color: "var(--ember-muted)",
                lineHeight: 1.7,
                margin: "0 0 32px",
              }}>
                Tu contraseña fue restablecida con éxito. Serás redirigido al inicio de sesión en unos segundos.
              </p>

              <Link href="/login" style={{
                display: "block",
                textAlign: "center",
                padding: "16px",
                background: "linear-gradient(135deg, #F4721E 0%, #E05A10 100%)",
                border: "none",
                borderRadius: 10,
                fontFamily: "var(--font-syne)",
                fontWeight: 700,
                fontSize: 15,
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 4px 24px rgba(244,114,30,0.35)",
              }}>
                Ir al inicio de sesión →
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
                Nueva contraseña
              </h1>
              <p style={{
                fontFamily: "var(--font-dm)",
                fontSize: 14,
                color: "var(--ember-muted)",
                margin: "0 0 44px",
              }}>
                Elige una contraseña segura para tu cuenta
              </p>

              <form onSubmit={handleSubmit}>
                {/* Nueva contraseña */}
                <div style={{ marginBottom: 28 }}>
                  <label style={LABEL_STYLE}>Nueva contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${password ? (isStrong ? "var(--ember-orange)" : "#E55") : "var(--ember-border)"}`,
                        padding: "12px 36px 12px 0",
                        fontFamily: "var(--font-lora)",
                        fontSize: 16,
                        color: "var(--ember-text)",
                        outline: "none",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--ember-muted)",
                        padding: 4,
                      }}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  {password && !isStrong && (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#E55", marginTop: 6 }}>
                      Mínimo 8 caracteres
                    </p>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div style={{ marginBottom: 40 }}>
                  <label style={LABEL_STYLE}>Confirmar contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${confirm ? (passwordsMatch ? "var(--ember-orange)" : "#E55") : "var(--ember-border)"}`,
                        padding: "12px 36px 12px 0",
                        fontFamily: "var(--font-lora)",
                        fontSize: 16,
                        color: "var(--ember-text)",
                        outline: "none",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--ember-muted)",
                        padding: 4,
                      }}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                  {confirm && !passwordsMatch && (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#E55", marginTop: 6 }}>
                      Las contraseñas no coinciden
                    </p>
                  )}
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
                  disabled={loading || !isStrong || !passwordsMatch || !confirm}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: (loading || !isStrong || !passwordsMatch || !confirm)
                      ? "var(--ember-border)"
                      : "linear-gradient(135deg, #F4721E 0%, #E05A10 100%)",
                    border: "none",
                    borderRadius: 10,
                    fontFamily: "var(--font-syne)",
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "0.02em",
                    color: (loading || !isStrong || !passwordsMatch || !confirm) ? "var(--ember-muted)" : "#fff",
                    cursor: (loading || !isStrong || !passwordsMatch || !confirm) ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: (loading || !isStrong || !passwordsMatch || !confirm) ? "none" : "0 4px 24px rgba(244,114,30,0.35)",
                  }}
                >
                  {loading ? "Guardando..." : "Establecer nueva contraseña →"}
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
