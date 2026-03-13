"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const loginResponsiveCss = `
  .auth-shell {
    min-height: 100dvh;
    overflow-x: hidden;
  }

  .auth-form-panel {
    padding: 40px 24px;
  }

  .auth-mobile-brand {
    margin-bottom: 40px;
  }

  .auth-title {
    font-size: 32px;
  }

  .auth-subtitle {
    margin: 0 0 44px;
  }

  @media (max-width: 1023px) {
    .auth-form-panel {
      align-items: flex-start !important;
      padding: calc(20px + env(safe-area-inset-top)) 16px
        calc(24px + env(safe-area-inset-bottom));
    }

    .auth-form-card {
      max-width: 560px !important;
      margin: 0 auto;
    }

    .auth-mobile-brand {
      margin-bottom: 26px;
    }

    .auth-title {
      font-size: clamp(1.7rem, 6.5vw, 2rem) !important;
    }

    .auth-subtitle {
      margin: 0 0 28px !important;
    }
  }
`;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      {/* Email */}
      <div style={{ marginBottom: 28 }}>
        <label style={{
          display: "block",
          fontFamily: "var(--font-dm)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ember-muted)",
          marginBottom: 10,
        }}>
          Correo electrónico
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${email ? "var(--ember-orange)" : "var(--ember-border)"}`,
            padding: "14px 0",
            fontFamily: "var(--font-lora)",
            fontSize: 16,
            color: "var(--ember-text)",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderBottomColor = "var(--ember-orange)"}
          onBlur={e => e.target.style.borderBottomColor = email ? "var(--ember-orange)" : "var(--ember-border)"}
        />
      </div>

      {/* Password */}
      <div style={{ marginBottom: 28 }}>
        <label style={{
          display: "block",
          fontFamily: "var(--font-dm)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ember-muted)",
          marginBottom: 10,
        }}>
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${password ? "var(--ember-orange)" : "var(--ember-border)"}`,
            padding: "14px 0",
            fontFamily: "var(--font-lora)",
            fontSize: 16,
            color: "var(--ember-text)",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderBottomColor = "var(--ember-orange)"}
          onBlur={e => e.target.style.borderBottomColor = password ? "var(--ember-orange)" : "var(--ember-border)"}
        />
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <Link href="/forgot-password" style={{
            fontFamily: "var(--font-dm)",
            fontSize: 12,
            color: "var(--ember-muted)",
            textDecoration: "none",
            display: "inline-block",
            padding: "8px 0",
          }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      {/* Error */}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "16px",
          minHeight: 50,
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
          touchAction: "manipulation",
        }}
      >
        {loading ? "Verificando..." : "Entrar al panel →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grain auth-shell" style={{ background: "var(--ember-bg)", display: "flex" }}>
      <style>{loginResponsiveCss}</style>

      {/* Panel izquierdo — visual */}
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
            Tu restaurante,<br />
            <span style={{ color: "var(--ember-orange)" }}>en línea</span><br />
            en minutos.
          </p>
          <p style={{
            fontFamily: "var(--font-dm)",
            fontSize: 14,
            color: "var(--ember-muted)",
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            La plataforma de pedidos para taquerías, pizzerías y más.
            Sin comisiones por pedido.
          </p>
        </div>

        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--ember-muted)" }}>
          © 2026 Haloo · haloo.click
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="auth-form-panel" style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ember-bg)",
      }}>
        <div className="auth-form-card" style={{ width: "100%", maxWidth: 400 }}>

          <div className="lg:hidden auth-mobile-brand" style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 800,
            fontSize: 24,
            color: "var(--ember-text)",
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

          <h1 className="auth-title" style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 700,
            color: "var(--ember-text)",
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}>
            Bienvenido de vuelta
          </h1>
          <p className="auth-subtitle" style={{
            fontFamily: "var(--font-dm)",
            fontSize: 14,
            color: "var(--ember-muted)",
          }}>
            Accede a tu panel de restaurante
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p style={{
            fontFamily: "var(--font-dm)",
            fontSize: 13,
            color: "var(--ember-muted)",
            marginTop: 32,
            textAlign: "center",
          }}>
            ¿Sin cuenta aún?{" "}
            <Link href="/register" style={{
              color: "var(--ember-gold)",
              textDecoration: "none",
              fontWeight: 500,
            }}>
              Registra tu restaurante
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
