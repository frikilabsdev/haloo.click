"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { slugify, isValidSlug } from "@/lib/utils";
import { RESTAURANT_TYPES } from "@/lib/restaurant-types";

// ─── Estilos constantes ────────────────────────────────────────────────────────
const LABEL: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-dm)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ember-muted)",
  marginBottom: 10,
};

const INPUT_BASE: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  padding: "14px 0",
  fontFamily: "var(--font-lora)",
  fontSize: 16,
  color: "var(--ember-text)",
  outline: "none",
  transition: "border-color 0.2s",
};

const registerResponsiveCss = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-14px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .reg-step {
    animation: slideIn 0.28s ease;
  }

  select option {
    background: #1a1512;
    color: #f0ebe3;
  }

  .reg-shell,
  .reg-success-shell {
    min-height: 100dvh;
    overflow-x: hidden;
  }

  .reg-shell {
    padding: 40px 24px;
  }

  .reg-card {
    width: 100%;
    max-width: 460px;
  }

  .reg-brand {
    margin-bottom: 44px;
  }

  .reg-header {
    margin-bottom: 36px;
  }

  .reg-step-title {
    font-size: 24px;
  }

  .reg-cta-stack {
    display: flex;
    gap: 12px;
  }

  .reg-success-shell {
    padding: 24px;
  }

  .reg-success-card {
    width: 100%;
    max-width: 440px;
    text-align: center;
  }

  @media (max-width: 640px) {
    .reg-shell,
    .reg-success-shell {
      align-items: flex-start !important;
      justify-content: center;
      padding: calc(18px + env(safe-area-inset-top)) 16px
        calc(24px + env(safe-area-inset-bottom));
    }

    .reg-card,
    .reg-success-card {
      max-width: 560px !important;
    }

    .reg-brand {
      margin-bottom: 28px;
    }

    .reg-header {
      margin-bottom: 28px;
    }

    .reg-step-title {
      font-size: clamp(1.35rem, 6vw, 1.6rem) !important;
    }

    .reg-cta-stack {
      flex-direction: column;
    }
  }
`;

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Field({
  label,
  active,
  hasValue,
  children,
}: {
  label: string;
  active: boolean;
  hasValue: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={LABEL}>{label}</label>
      <div style={{
        borderBottom: `1px solid ${active || hasValue ? "var(--ember-orange)" : "var(--ember-border)"}`,
        transition: "border-color 0.2s",
      }}>
        {children}
      </div>
    </div>
  );
}

function TextInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} active={focused} hasValue={!!props.value}>
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{ ...INPUT_BASE, ...props.style }}
      />
    </Field>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "rgba(244,114,30,0.08)",
      border: "1px solid rgba(244,114,30,0.3)",
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 20,
      fontFamily: "var(--font-dm)",
      fontSize: 13,
      color: "var(--ember-orange)",
    }}>
      {msg}
    </div>
  );
}

function Btn({
  children,
  loading,
  style,
}: {
  children: React.ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="submit"
      disabled={!!loading}
      style={{
        width: "100%",
        padding: "15px",
        minHeight: 50,
        background: loading ? "var(--ember-border)" : "linear-gradient(135deg, #F4721E 0%, #E05A10 100%)",
        border: "none",
        borderRadius: 10,
        fontFamily: "var(--font-syne)",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.02em",
        color: loading ? "var(--ember-muted)" : "#fff",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        boxShadow: loading ? "none" : "0 4px 24px rgba(244,114,30,0.35)",
        touchAction: "manipulation",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false); // si el user editó el slug manualmente

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    restaurantName: "",
    type: "",
    slug: "",
    whatsapp: "",
  });

  const slugStatus = (() => {
    if (!form.slug) return "empty";
    if (isValidSlug(form.slug)) return "valid";
    return "invalid";
  })();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm(prev => {
      const next = { ...prev, [name]: value };

      // Auto-generar slug solo si el usuario no lo ha editado manualmente
      if (name === "restaurantName" && !slugEdited) {
        next.slug = slugify(value);
      }

      // Si el usuario edita el slug directamente, limpiar en tiempo real
      if (name === "slug") {
        next.slug = slugify(value);
        setSlugEdited(true);
      }

      return next;
    });
  }, [slugEdited]);

  // El campo slug tiene tratamiento especial: limpia caracteres en cada keystroke
  const handleSlugKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cleaned = slugify(input.value);
    if (cleaned !== form.slug) {
      setForm(prev => ({ ...prev, slug: cleaned }));
    }
    setSlugEdited(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step === 1) {
      if (form.password !== form.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      if (form.password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    if (!isValidSlug(form.slug)) {
      setError("La URL de tu menú no es válida. Usa solo letras, números y guiones.");
      return;
    }

    if (!form.type) {
      setError("Selecciona el tipo de restaurante.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al registrar.");
      setLoading(false);
      return;
    }

    // Auto-login: iniciar sesión con las credenciales recién creadas
    const result = await signIn("credentials", {
      email:    form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      // proxy.ts redirige a /pendiente si tenantStatus === PENDING
      router.push("/dashboard");
    } else {
      // Si el auto-login falla (edge case), mostrar pantalla de éxito manual
      setSuccess(true);
    }
  }

  // ── Pantalla de éxito ──
  if (success) {
    const waMsg = encodeURIComponent(
      `Hola, acabo de registrar mi restaurante *${form.restaurantName}* en Haloo (haloo.click/${form.slug}). ¿Me pueden activar la cuenta? Gracias.`
    );
    const waLink = `https://wa.me/529711260809?text=${waMsg}`;

    return (
      <div className="grain reg-success-shell" style={{ background: "var(--ember-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{registerResponsiveCss}</style>
        <div className="reg-success-card">
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #F4721E, #E05A10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px", boxShadow: "0 0 48px rgba(244,114,30,0.5)", fontSize: 32,
          }}>
            🎉
          </div>
          <h2 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 26, color: "var(--ember-text)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            ¡Registro exitoso!
          </h2>
          <p style={{ fontFamily: "var(--font-lora)", fontStyle: "italic", fontSize: 15, color: "var(--ember-muted)", lineHeight: 1.7, margin: "0 0 6px" }}>
            Tu restaurante <strong style={{ color: "var(--ember-text)", fontStyle: "normal" }}>{form.restaurantName}</strong> fue registrado.
          </p>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--ember-muted)", margin: "0 0 24px" }}>
            Tu URL: <span style={{ color: "var(--ember-orange)" }}>haloo.click/{form.slug}</span>
          </p>

          {/* Caja de instrucciones */}
          <div style={{
            background: "rgba(244,114,30,0.08)", border: "1px solid rgba(244,114,30,0.25)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "left",
          }}>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 700, color: "var(--ember-orange)", margin: "0 0 6px" }}>
              ¿Qué sigue?
            </p>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--ember-muted)", margin: 0, lineHeight: 1.65 }}>
              Para activar tu cuenta, envíanos un mensaje por WhatsApp. El equipo de Haloo activará tu restaurante en breve.
            </p>
          </div>

          {/* Botón WhatsApp */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "14px 20px",
              minHeight: 50,
              background: "#25D366", borderRadius: 10,
              fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 14,
              color: "#fff", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(37,211,102,0.35)",
              marginBottom: 12,
              touchAction: "manipulation",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.533 5.851L.057 23.999l6.305-1.654A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.378l-.36-.213-3.733.979 1.001-3.642-.234-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
            </svg>
            Enviar mensaje para activar mi cuenta
          </a>

          <Link href="/login" style={{
            display: "block", fontFamily: "var(--font-dm)", fontSize: 13,
            color: "var(--ember-muted)", textDecoration: "none",
            padding: "8px 0",
          }}>
            Ya tengo activación → Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grain reg-shell" style={{ background: "var(--ember-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{registerResponsiveCss}</style>

      <div className="reg-card">

        {/* Brand */}
        <div className="reg-brand" style={{ fontFamily: "var(--font-syne)", fontWeight: 800, fontSize: 24, color: "var(--ember-text)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--ember-orange)", boxShadow: "0 0 12px var(--ember-orange)" }} />
          Haloo
        </div>

        {/* Step bar */}
        <div className="reg-header">
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: s <= step ? "linear-gradient(90deg, #F4721E, #F5B944)" : "var(--ember-border)",
                transition: "background 0.4s",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span className="reg-step-title" style={{ fontFamily: "var(--font-syne)", fontWeight: 700, color: "var(--ember-text)", letterSpacing: "-0.02em" }}>
              {step === 1 ? "Crea tu cuenta" : "Tu restaurante"}
            </span>
            <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--ember-muted)" }}>{step} de 2</span>
          </div>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--ember-muted)", margin: "4px 0 0" }}>
            {step === 1 ? "Acceso a tu panel de administración" : "Cómo te verán tus clientes"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── PASO 1: cuenta ── */}
          {step === 1 && (
            <div className="reg-step">
              <TextInput
                label="Correo electrónico"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
              />
              <TextInput
                label="Contraseña"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
              />
              <TextInput
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                required
                autoComplete="new-password"
              />

              {error && <ErrorBox msg={error} />}
              <Btn>Continuar →</Btn>
            </div>
          )}

          {/* ── PASO 2: restaurante ── */}
          {step === 2 && (
            <div className="reg-step">

              {/* Nombre del restaurante */}
              <TextInput
                label="Nombre del restaurante"
                name="restaurantName"
                type="text"
                value={form.restaurantName}
                onChange={handleChange}
                placeholder="Tacos El Gordo"
                required
              />

              {/* Tipo de restaurante */}
              <div style={{ marginBottom: 28 }}>
                <label style={LABEL}>Tipo de restaurante</label>
                <div style={{ borderBottom: `1px solid ${form.type ? "var(--ember-orange)" : "var(--ember-border)"}`, transition: "border-color 0.2s" }}>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    required
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: "14px 0",
                      fontFamily: "var(--font-lora)",
                      fontSize: 16,
                      color: form.type ? "var(--ember-text)" : "var(--ember-muted)",
                      outline: "none",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled style={{ color: "#7A6F63" }}>Selecciona una categoría</option>
                    {RESTAURANT_TYPES.map(t => (
                      <option key={t} value={t.toLowerCase()}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* URL del menú con slug en tiempo real */}
              <div style={{ marginBottom: 28 }}>
                <label style={LABEL}>
                  URL de tu menú
                  {form.slug && (
                    <span style={{
                      marginLeft: 8,
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                      fontSize: 10,
                      color: slugStatus === "valid" ? "#4ade80" : slugStatus === "invalid" ? "#f87171" : "var(--ember-muted)",
                    }}>
                      {slugStatus === "valid" ? "✓ Disponible para verificar" : "✗ URL inválida"}
                    </span>
                  )}
                </label>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: `1px solid ${
                    slugStatus === "valid" ? "var(--ember-orange)"
                    : slugStatus === "invalid" ? "#f87171"
                    : "var(--ember-border)"
                  }`,
                  transition: "border-color 0.2s",
                  paddingBottom: 0,
                }}>
                  <span style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--ember-muted)", whiteSpace: "nowrap", userSelect: "none" }}>
                    haloo.click/
                  </span>
                  <input
                    name="slug"
                    type="text"
                    required
                    value={form.slug}
                    onChange={handleChange}
                    onKeyUp={handleSlugKeyUp}
                    placeholder="tu-restaurante"
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      padding: "14px 6px",
                      fontFamily: "var(--font-lora)",
                      fontSize: 15,
                      color: slugStatus === "invalid" ? "#f87171" : "var(--ember-orange)",
                      outline: "none",
                    }}
                  />
                </div>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--ember-muted)", margin: "6px 0 0" }}>
                  Solo letras minúsculas, números y guiones. Sin espacios ni caracteres especiales.
                </p>
              </div>

              {/* WhatsApp — type tel */}
              <div style={{ marginBottom: 28 }}>
                <label style={LABEL}>WhatsApp del restaurante</label>
                <div style={{ borderBottom: `1px solid ${form.whatsapp ? "var(--ember-orange)" : "var(--ember-border)"}`, transition: "border-color 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--ember-muted)", userSelect: "none" }}>🇲🇽</span>
                  <input
                    name="whatsapp"
                    type="tel"
                    required
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="+52 55 1234 5678"
                    autoComplete="tel"
                    inputMode="tel"
                    style={{ ...INPUT_BASE, flex: 1 }}
                  />
                </div>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--ember-muted)", margin: "6px 0 0" }}>
                  Los pedidos se enviarán a este número.
                </p>
              </div>

              {error && <ErrorBox msg={error} />}

              {/* Aviso de privacidad */}
              <p style={{
                fontFamily: "var(--font-dm)",
                fontSize: 12,
                color: "var(--ember-muted)",
                lineHeight: 1.6,
                margin: "0 0 20px",
              }}>
                Al registrarte aceptas nuestro{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--ember-gold)", textDecoration: "none" }}
                >
                  Aviso de Privacidad
                </a>
                {" "}conforme a la LFPDPPP.
              </p>

              <div className="reg-cta-stack">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="reg-back-btn"
                  style={{
                    flex: 1,
                    padding: 15,
                    minHeight: 48,
                    background: "transparent",
                    border: "1px solid var(--ember-border)",
                    borderRadius: 10,
                    fontFamily: "var(--font-syne)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--ember-muted)",
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                >
                  ← Atrás
                </button>
                <Btn loading={loading} style={{ flex: 2 }}>
                  {loading ? "Enviando..." : "Solicitar alta →"}
                </Btn>
              </div>
            </div>
          )}
        </form>

        <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--ember-muted)", marginTop: 28, textAlign: "center" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: "var(--ember-gold)", textDecoration: "none", fontWeight: 500, display: "inline-block", padding: "8px 0" }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
