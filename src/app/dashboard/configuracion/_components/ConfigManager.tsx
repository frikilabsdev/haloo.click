"use client";

import { useState, useEffect, useCallback } from "react";
import { RESTAURANT_TYPES } from "@/lib/restaurant-types";
import { CropModal } from "./CropModal";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TenantData {
  id:                      string;
  name:                    string;
  slug:                    string;
  description:             string | null;
  type:                    string | null;
  phone:                   string | null;
  whatsappNumber:          string | null;
  whatsappMessageTemplate: string | null;
  stateId:                 string | null;
  cityId:                  string | null;
  address:                 string | null;
  logo:                    string | null;
  coverImage:              string | null;
  deliveryEnabled:         boolean;
  pickupEnabled:           boolean;
}

interface LocationItem {
  id:   string;
  name: string;
  slug: string;
}

interface ScheduleRow {
  dayOfWeek: number;
  openTime:  string;
  closeTime: string;
  isActive:  boolean;
}

interface PaymentData {
  cashEnabled:     boolean;
  transferEnabled: boolean;
  cardEnabled:     boolean;
  bankName:        string | null;
  clabe:           string | null;
  accountNumber:   string | null;
  accountHolder:   string | null;
  reference:       string | null;
}

interface ZoneRow {
  id:       string;
  name:     string;
  cost:     string;
  isFree:   boolean;
  isActive: boolean;
}

interface Props {
  initialTenant: TenantData;
  initialZones:  ZoneRow[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const DEFAULT_SCHEDULES: ScheduleRow[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  openTime:  "09:00",
  closeTime: "22:00",
  isActive:  i !== 0,
}));

const DEFAULT_PAYMENT: PaymentData = {
  cashEnabled:     true,
  transferEnabled: false,
  cardEnabled:     false,
  bankName:        null,
  clabe:           null,
  accountNumber:   null,
  accountHolder:   null,
  reference:       null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const res  = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Error del servidor." };
    return json;
  } catch {
    return { error: "Error de conexión." };
  }
}

async function compressImage(file: File, maxDim = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const ratio = Math.min(1, maxDim / Math.max(width, height));
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas no disponible")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("Compresión fallida")); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

async function uploadImage(file: File): Promise<string | null> {
  try {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    const res  = await fetch("/api/menu/upload", { method: "POST", body: fd });
    const json = await res.json();
    return json.url ?? null;
  } catch {
    return null;
  }
}

function formatCost(cost: string | number): string {
  const n = typeof cost === "string" ? parseFloat(cost) : cost;
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

// ── Componente principal ───────────────────────────────────────────────────────

export function ConfigManager({ initialTenant, initialZones }: Props) {
  const [tab, setTab] = useState<"general" | "horarios" | "pagos" | "zonas">("general");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 22, color: "var(--dash-text)", margin: "0 0 4px" }}>
          Configuración
        </h1>
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>
          Administra la información, horarios y pagos de tu restaurante.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, flexWrap: "wrap",
        borderBottom: "1px solid var(--dash-border)",
        paddingBottom: 0,
      }}>
        {(["general", "horarios", "pagos", "zonas"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: tab === t ? 600 : 500,
              color: tab === t ? "var(--dash-orange)" : "var(--dash-muted)",
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 14px", borderRadius: "8px 8px 0 0",
              borderBottom: tab === t ? "2px solid var(--dash-orange)" : "2px solid transparent",
              textTransform: "capitalize",
              transition: "all 0.15s",
            }}
          >
            {t === "general" ? "General" :
             t === "horarios" ? "Horarios" :
             t === "pagos" ? "Pagos" : "Zonas de entrega"}
          </button>
        ))}
      </div>

      {/* Sección activa */}
      {tab === "general"  && <GeneralSection  tenant={initialTenant} />}
      {tab === "horarios" && <HorariosSection tenant={initialTenant} />}
      {tab === "pagos"    && <PagosSection    tenant={initialTenant} />}
      {tab === "zonas"    && <ZonasSection    initialZones={initialZones} tenant={initialTenant} />}
    </div>
  );
}

// ── GeneralSection ─────────────────────────────────────────────────────────────

function GeneralSection({ tenant }: { tenant: TenantData }) {
  const [name,        setName]        = useState(tenant.name);
  const [description, setDescription] = useState(tenant.description ?? "");
  const [type,        setType]        = useState(tenant.type ?? "");
  const [phone,       setPhone]       = useState(tenant.phone ?? "");
  const [whatsapp,    setWhatsapp]    = useState(tenant.whatsappNumber ?? "");
  const [stateId,     setStateId]     = useState(tenant.stateId ?? "");
  const [cityId,      setCityId]      = useState(tenant.cityId ?? "");
  const [address,     setAddress]     = useState(tenant.address ?? "");

  const [states,      setStates]      = useState<LocationItem[]>([]);
  const [cities,      setCities]      = useState<LocationItem[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [template,    setTemplate]    = useState(tenant.whatsappMessageTemplate ?? "");
  const [logo,        setLogo]        = useState(tenant.logo ?? "");
  const [cover,       setCover]       = useState(tenant.coverImage ?? "");

  const [logoUploading,  setLogoUploading]  = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  // ── Cargar estados al montar ──────────────────────────────────────────────
  useEffect(() => {
    setLoadingLocs(true);
    fetch("/api/locations")
      .then(r => r.json())
      .then(j => setStates(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingLocs(false));
  }, []);

  // ── Cargar ciudades cuando cambia el estado seleccionado ─────────────────
  useEffect(() => {
    if (!stateId) { setCities([]); setCityId(""); return; }
    fetch(`/api/locations?stateId=${stateId}`)
      .then(r => r.json())
      .then(j => setCities(j.data ?? []))
      .catch(() => setCities([]));
  }, [stateId]);

  // ── Crop modal state ────────────────────────────────────────────────────────
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<number>(1);
  const [cropTarget, setCropTarget] = useState<"logo" | "cover" | null>(null);

  const openCrop = useCallback((file: File, target: "logo" | "cover") => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setCropSource(dataUrl);
      setCropTarget(target);
      setCropAspect(target === "logo" ? 1 : 16 / 9);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    const target = cropTarget;
    setCropSource(null);
    setCropTarget(null);

    if (target === "logo")  setLogoUploading(true);
    if (target === "cover") setCoverUploading(true);

    const file = new File([blob], "crop.jpg", { type: "image/jpeg" });
    const url  = await uploadImage(file);

    if (target === "logo")  setLogoUploading(false);
    if (target === "cover") setCoverUploading(false);

    if (url) {
      if (target === "logo")  setLogo(url);
      if (target === "cover") setCover(url);
    } else {
      alert("Error al subir la imagen. Intenta de nuevo.");
    }
  }, [cropTarget]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    openCrop(file, "logo");
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    openCrop(file, "cover");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (!name.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true);
    const res = await apiFetch("/api/settings/tenant", {
      method: "PATCH",
      body: JSON.stringify({
        name:                    name.trim(),
        description:             description.trim() || null,
        type:                    type.trim() || null,
        phone:                   phone.trim() || null,
        whatsappNumber:          whatsapp.trim() || null,
        whatsappMessageTemplate: template.trim() || null,
        stateId:                 stateId || null,
        cityId:                  cityId  || null,
        address:                 address.trim() || null,
        logo:                    logo.trim() || null,
        coverImage:              cover.trim() || null,
      }),
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>

      {/* Logo + Cover */}
      <SectionCard title="Imágenes">

        {/* ── Vista previa combinada (replica el encabezado del menú público) ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", margin: 0 }}>
              Vista previa — así se verá en tu menú
            </p>
          </div>

          {/* Contenedor relativo para cover + logo overlapping */}
          <div style={{ position: "relative", paddingBottom: 46 }}>
            {/* Cover */}
            <div style={{
              width: "100%", height: 160, borderRadius: 12, overflow: "hidden",
              background: "var(--dash-canvas)",
              border: "1px solid var(--dash-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {cover
                ? <img src={cover} alt="Portada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)" }}>Sin portada</span>
              }
            </div>
            {/* Logo — superpuesto igual que en el menú */}
            <div style={{
              position: "absolute", bottom: 0, left: 20,
              width: 72, height: 72, borderRadius: 18,
              background: "var(--dash-surface)",
              border: "2px solid var(--dash-border)",
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
            }}>
              {logo
                ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 24 }}>🍴</span>
              }
            </div>
          </div>
        </div>

        {/* ── Controles en dos columnas ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Logo */}
          <div>
            <label style={labelStyle}>Logo</label>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", margin: "4px 0 10px", lineHeight: 1.5 }}>
              Cuadrado · 1:1 · se superpone sobre la portada.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={logo} onChange={e => setLogo(e.target.value)} placeholder="Pega una URL" style={{ ...inputStyle, flex: 1 }} />
              <label style={{ ...btnSecondaryStyle, cursor: "pointer", whiteSpace: "nowrap" }}>
                {logoUploading ? "…" : "Subir"}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          {/* Portada */}
          <div>
            <label style={labelStyle}>Portada</label>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", margin: "4px 0 10px", lineHeight: 1.5 }}>
              Apaisado · 16:9 · imagen de fondo del menú.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={cover} onChange={e => setCover(e.target.value)} placeholder="Pega una URL" style={{ ...inputStyle, flex: 1 }} />
              <label style={{ ...btnSecondaryStyle, cursor: "pointer", whiteSpace: "nowrap" }}>
                {coverUploading ? "…" : "Subir"}
                <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>

        </div>
      </SectionCard>

      {/* Info básica */}
      <SectionCard title="Información del restaurante">
        <FormField label="Nombre *">
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} maxLength={80} />
        </FormField>
        <FormField label="Descripción">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: "vertical" }} maxLength={500} />
        </FormField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Tipo de cocina">
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              <option value="">Selecciona una categoría</option>
              {RESTAURANT_TYPES.map(t => (
                <option key={t} value={t.toLowerCase()}>{t}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Slug (URL)">
            <input value={tenant.slug} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
          </FormField>
        </div>
      </SectionCard>

      {/* Contacto */}
      <SectionCard title="Contacto y ubicación">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Teléfono">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 0000 0000" style={inputStyle} maxLength={30} />
          </FormField>
          <FormField label="WhatsApp">
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+525500000000" style={inputStyle} maxLength={30} />
          </FormField>
          <FormField label="Estado">
            <select
              value={stateId}
              onChange={e => setStateId(e.target.value)}
              style={inputStyle}
              disabled={loadingLocs}
            >
              <option value="">{loadingLocs ? "Cargando…" : states.length === 0 ? "Sin estados disponibles" : "Selecciona un estado"}</option>
              {states.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Ciudad">
            <select
              value={cityId}
              onChange={e => setCityId(e.target.value)}
              style={inputStyle}
              disabled={!stateId || cities.length === 0}
            >
              <option value="">{!stateId ? "Elige estado primero" : cities.length === 0 ? "Sin ciudades en este estado" : "Selecciona una ciudad"}</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Dirección">
          <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} maxLength={200} />
        </FormField>
      </SectionCard>

      {/* Plantilla WhatsApp */}
      <SectionCard title="Plantilla de mensaje WhatsApp">
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: "0 0 10px" }}>
          Variables disponibles: <code style={{ background: "var(--dash-canvas)", padding: "1px 5px", borderRadius: 4 }}>{"{items}"}</code> <code style={{ background: "var(--dash-canvas)", padding: "1px 5px", borderRadius: 4 }}>{"{total}"}</code> <code style={{ background: "var(--dash-canvas)", padding: "1px 5px", borderRadius: 4 }}>{"{name}"}</code> <code style={{ background: "var(--dash-canvas)", padding: "1px 5px", borderRadius: 4 }}>{"{address}"}</code> <code style={{ background: "var(--dash-canvas)", padding: "1px 5px", borderRadius: 4 }}>{"{payment}"}</code>
        </p>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={6}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          maxLength={2000}
        />
      </SectionCard>

      {error && <ErrorMsg>{error}</ErrorMsg>}
      {success && <SuccessMsg>Cambios guardados correctamente.</SuccessMsg>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={saving} style={btnPrimaryStyle(saving)}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {/* Modal de recorte */}
      {cropSource && cropTarget && (
        <CropModal
          imageSrc={cropSource}
          aspect={cropAspect}
          title={cropTarget === "logo" ? "Recortar logo" : "Recortar portada"}
          hint={cropTarget === "logo"
            ? "Elige el encuadre cuadrado que se verá en el menú (1:1)"
            : "Elige el área que se verá como cabecera del restaurante (16:9)"}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSource(null); setCropTarget(null); }}
        />
      )}
    </form>
  );
}

// ── HorariosSection ────────────────────────────────────────────────────────────

function HorariosSection({ tenant }: { tenant: TenantData }) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>(DEFAULT_SCHEDULES);
  const [loaded,  setLoaded]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch<ScheduleRow[]>("/api/settings/schedules").then(res => {
      if (res.data && res.data.length === 7) {
        setSchedules(res.data.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
      }
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const update = (idx: number, field: keyof ScheduleRow, value: string | boolean) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setError(""); setSuccess(false);
    setSaving(true);
    const res = await apiFetch("/api/settings/schedules", {
      method: "PUT",
      body: JSON.stringify(schedules),
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (!loaded) return (
    <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--dash-muted)" }}>
      Cargando horarios…
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <SectionCard title="Horarios de atención">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 64px", gap: 8, padding: "0 4px 10px", alignItems: "center" }}>
            <span style={colLabelStyle}>Día</span>
            <span style={colLabelStyle}>Apertura</span>
            <span style={colLabelStyle}>Cierre</span>
            <span style={{ ...colLabelStyle, textAlign: "center" }}>Activo</span>
          </div>

          {schedules.map((s, i) => (
            <div key={s.dayOfWeek} style={{
              display: "grid", gridTemplateColumns: "1fr 120px 120px 64px",
              gap: 8, padding: "10px 4px", alignItems: "center",
              borderTop: "1px solid var(--dash-border)",
              opacity: s.isActive ? 1 : 0.5,
              transition: "opacity 0.15s",
            }}>
              <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 500, color: "var(--dash-text)" }}>
                {DAYS[s.dayOfWeek]}
              </span>
              <input
                type="time"
                value={s.openTime}
                onChange={e => update(i, "openTime", e.target.value)}
                disabled={!s.isActive}
                style={{ ...inputStyle, padding: "6px 8px" }}
              />
              <input
                type="time"
                value={s.closeTime}
                onChange={e => update(i, "closeTime", e.target.value)}
                disabled={!s.isActive}
                style={{ ...inputStyle, padding: "6px 8px" }}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Toggle
                  checked={s.isActive}
                  onChange={v => update(i, "isActive", v)}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {error && <ErrorMsg>{error}</ErrorMsg>}
      {success && <SuccessMsg>Horarios guardados correctamente.</SuccessMsg>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle(saving)}>
          {saving ? "Guardando…" : "Guardar horarios"}
        </button>
      </div>
    </div>
  );
}

// ── PagosSection ───────────────────────────────────────────────────────────────

function PagosSection({ tenant }: { tenant: TenantData }) {
  const [payment,  setPayment]  = useState<PaymentData>(DEFAULT_PAYMENT);
  const [loaded,   setLoaded]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    apiFetch<PaymentData>("/api/settings/payment").then(res => {
      if (res.data) setPayment(res.data);
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const set = <K extends keyof PaymentData>(key: K, value: PaymentData[K]) =>
    setPayment(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setError(""); setSuccess(false);
    setSaving(true);
    const res = await apiFetch("/api/settings/payment", {
      method: "PATCH",
      body: JSON.stringify({
        ...payment,
        bankName:      payment.bankName?.trim()      || null,
        clabe:         payment.clabe?.trim()         || null,
        accountNumber: payment.accountNumber?.trim() || null,
        accountHolder: payment.accountHolder?.trim() || null,
        reference:     payment.reference?.trim()     || null,
      }),
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (!loaded) return (
    <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--dash-muted)" }}>
      Cargando configuración de pagos…
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <SectionCard title="Métodos de pago aceptados">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PaymentToggleRow
            label="Efectivo"
            checked={payment.cashEnabled}
            onChange={v => set("cashEnabled", v)}
          />
          <PaymentToggleRow
            label="Transferencia bancaria"
            checked={payment.transferEnabled}
            onChange={v => set("transferEnabled", v)}
          />
          <PaymentToggleRow
            label="Tarjeta (en el momento)"
            checked={payment.cardEnabled}
            onChange={v => set("cardEnabled", v)}
          />
        </div>
      </SectionCard>

      {payment.transferEnabled && (
        <SectionCard title="Datos bancarios para transferencia">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Banco">
              <input value={payment.bankName ?? ""} onChange={e => set("bankName", e.target.value)} placeholder="Ej: BBVA, Banorte…" style={inputStyle} maxLength={80} />
            </FormField>
            <FormField label="CLABE interbancaria">
              <input value={payment.clabe ?? ""} onChange={e => set("clabe", e.target.value)} placeholder="18 dígitos" style={inputStyle} maxLength={30} />
            </FormField>
            <FormField label="Número de cuenta (opcional)">
              <input value={payment.accountNumber ?? ""} onChange={e => set("accountNumber", e.target.value)} style={inputStyle} maxLength={30} />
            </FormField>
            <FormField label="Titular de la cuenta">
              <input value={payment.accountHolder ?? ""} onChange={e => set("accountHolder", e.target.value)} style={inputStyle} maxLength={100} />
            </FormField>
          </div>
          <FormField label="Referencia o concepto (opcional)">
            <input value={payment.reference ?? ""} onChange={e => set("reference", e.target.value)} placeholder="Ej: Número de pedido" style={inputStyle} maxLength={100} />
          </FormField>
        </SectionCard>
      )}

      {error && <ErrorMsg>{error}</ErrorMsg>}
      {success && <SuccessMsg>Configuración de pagos guardada.</SuccessMsg>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle(saving)}>
          {saving ? "Guardando…" : "Guardar pagos"}
        </button>
      </div>
    </div>
  );
}

// ── ZonasSection ───────────────────────────────────────────────────────────────

function ZonasSection({ initialZones, tenant }: { initialZones: ZoneRow[]; tenant: TenantData }) {
  const [zones,           setZones]           = useState<ZoneRow[]>(initialZones);
  const [newName,         setNewName]         = useState("");
  const [newCost,         setNewCost]         = useState("");
  const [newFree,         setNewFree]         = useState(false);
  const [adding,          setAdding]          = useState(false);
  const [addError,        setAddError]        = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(tenant.deliveryEnabled);
  const [pickupEnabled,   setPickupEnabled]   = useState(tenant.pickupEnabled);
  const [savingFlags,     setSavingFlags]     = useState(false);

  const handleToggleDelivery = async (val: boolean) => {
    setSavingFlags(true);
    setDeliveryEnabled(val);
    await apiFetch("/api/settings/tenant", {
      method: "PATCH",
      body: JSON.stringify({ deliveryEnabled: val }),
    });
    setSavingFlags(false);
  };

  const handleTogglePickup = async (val: boolean) => {
    setSavingFlags(true);
    setPickupEnabled(val);
    await apiFetch("/api/settings/tenant", {
      method: "PATCH",
      body: JSON.stringify({ pickupEnabled: val }),
    });
    setSavingFlags(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError("El nombre es requerido."); return; }
    const cost = parseFloat(newCost);
    if (!newFree && (isNaN(cost) || cost < 0)) { setAddError("Costo inválido."); return; }
    setAddError("");
    setAdding(true);
    const res = await apiFetch<ZoneRow>("/api/settings/zones", {
      method: "POST",
      body: JSON.stringify({
        name:   newName.trim(),
        cost:   newFree ? 0 : (cost || 0),
        isFree: newFree,
      }),
    });
    setAdding(false);
    if (res.error) { setAddError(res.error); return; }
    if (res.data) {
      setZones(prev => [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName(""); setNewCost(""); setNewFree(false);
    }
  };

  const handleToggleActive = async (zone: ZoneRow) => {
    const res = await apiFetch<ZoneRow>(`/api/settings/zones/${zone.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !zone.isActive }),
    });
    if (res.data) setZones(prev => prev.map(z => z.id === zone.id ? res.data! : z));
  };

  const handleDelete = async (zone: ZoneRow) => {
    if (!window.confirm(`¿Eliminar la zona "${zone.name}"?`)) return;
    const res = await apiFetch(`/api/settings/zones/${zone.id}`, { method: "DELETE" });
    if (!res.error) setZones(prev => prev.filter(z => z.id !== zone.id));
    else alert(res.error);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>

      {/* ── Opciones de entrega habilitadas ─────────────────────────────────── */}
      <SectionCard title="Opciones de entrega">
        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: 0 }}>
          Activa o desactiva los modos de entrega que ofrece tu restaurante. Los cambios se reflejan de inmediato en el checkout.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Domicilio */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--dash-canvas)", borderRadius: 12, border: "1px solid var(--dash-border)", opacity: savingFlags ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>🛵</span>
              <div>
                <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 14, color: "var(--dash-text)", margin: 0 }}>
                  A domicilio
                </p>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", margin: "2px 0 0" }}>
                  El cliente puede pedir que le lleven su pedido a su dirección.
                </p>
              </div>
            </div>
            <Toggle checked={deliveryEnabled} onChange={handleToggleDelivery} />
          </div>

          {/* Recoger en local */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--dash-canvas)", borderRadius: 12, border: "1px solid var(--dash-border)", opacity: savingFlags ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>🏠</span>
              <div>
                <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 14, color: "var(--dash-text)", margin: 0 }}>
                  Recoger en local
                </p>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", margin: "2px 0 0" }}>
                  El cliente pasa a recoger su pedido directamente al restaurante.
                </p>
              </div>
            </div>
            <Toggle checked={pickupEnabled} onChange={handleTogglePickup} />
          </div>

          {!deliveryEnabled && !pickupEnabled && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#dc2626", margin: 0 }}>
                ⚠️ No hay ningún modo de entrega activo. Los clientes no podrán completar su pedido.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Zonas de entrega">
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 14 }}>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#0369a1", margin: 0, lineHeight: 1.6 }}>
            <strong>¿Zonas o mapa?</strong> Si configuras zonas aquí, el cliente las verá en el checkout y elegirá la suya.
            Si no configuras ninguna zona, el checkout mostrará un mapa para que el cliente marque su ubicación exacta.
          </p>
        </div>

        {zones.length === 0 ? (
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: 0, textAlign: "center", padding: "20px 0" }}>
            Aún no hay zonas. Agrega la primera abajo.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 72px 36px", gap: 8, padding: "0 4px 10px", alignItems: "center" }}>
              <span style={colLabelStyle}>Nombre</span>
              <span style={colLabelStyle}>Costo</span>
              <span style={{ ...colLabelStyle, textAlign: "center" }}>Activa</span>
              <span />
            </div>

            {zones.map(zone => (
              <div key={zone.id} style={{
                display: "grid", gridTemplateColumns: "1fr 90px 72px 36px",
                gap: 8, padding: "10px 4px", alignItems: "center",
                borderTop: "1px solid var(--dash-border)",
                opacity: zone.isActive ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}>
                <div>
                  <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 500, color: "var(--dash-text)", margin: 0 }}>
                    {zone.name}
                  </p>
                  {zone.isFree && (
                    <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-green)", fontWeight: 600 }}>
                      Gratis
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: zone.isFree ? "var(--dash-green)" : "var(--dash-orange)" }}>
                  {zone.isFree ? "Gratis" : formatCost(zone.cost)}
                </span>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Toggle checked={zone.isActive} onChange={() => handleToggleActive(zone)} />
                </div>
                <button
                  onClick={() => handleDelete(zone)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dash-red)", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6 }}
                  title="Eliminar zona"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Agregar nueva zona */}
      <SectionCard title="Agregar zona">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <FormField label="Nombre de la zona">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ej: Centro, Recoger en local…"
                style={inputStyle}
                maxLength={80}
              />
            </FormField>
            <FormField label="Costo (MXN)">
              <input
                type="number"
                value={newCost}
                onChange={e => setNewCost(e.target.value)}
                placeholder="0.00"
                disabled={newFree}
                style={{ ...inputStyle, opacity: newFree ? 0.4 : 1 }}
                min="0" step="0.01"
              />
            </FormField>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)" }}>
            <input type="checkbox" checked={newFree} onChange={e => { setNewFree(e.target.checked); if (e.target.checked) setNewCost("0"); }} />
            Entrega gratuita (ej: recoger en local)
          </label>
          {addError && <ErrorMsg>{addError}</ErrorMsg>}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleAdd} disabled={adding} style={btnPrimaryStyle(adding)}>
              {adding ? "Agregando…" : "Agregar zona"}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--dash-surface)",
      border: "1px solid var(--dash-border)",
      borderRadius: 14, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <p style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 14, color: "var(--dash-text)", margin: 0 }}>
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 100, border: "none", cursor: "pointer",
        background: checked ? "var(--dash-orange)" : "var(--dash-border)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function PaymentToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--dash-border)" }}>
      <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 500, color: "var(--dash-text)" }}>
        {label}
      </span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-red)", margin: 0, padding: "10px 14px", background: "var(--dash-red-soft)", borderRadius: 8 }}>
      {children}
    </p>
  );
}

function SuccessMsg({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-green)", margin: 0, padding: "10px 14px", background: "var(--dash-green-soft)", borderRadius: 8 }}>
      {children}
    </p>
  );
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
    </svg>
  );
}

// ── Estilos compartidos ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm)", fontSize: 13,
  padding: "8px 11px", borderRadius: 8,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-canvas)", color: "var(--dash-text)",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600,
  color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
};

const colLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 700,
  color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.06em",
};

const btnPrimaryStyle = (disabled: boolean): React.CSSProperties => ({
  fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600,
  padding: "9px 20px", borderRadius: 8,
  background: disabled ? "var(--dash-border)" : "var(--dash-orange)",
  color: disabled ? "var(--dash-muted)" : "#fff",
  border: "none", cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.15s",
});

const btnSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 500,
  padding: "7px 12px", borderRadius: 8,
  background: "var(--dash-canvas)", color: "var(--dash-text)",
  border: "1px solid var(--dash-border)",
  display: "inline-flex", alignItems: "center",
};
