"use client";

import { useState, useMemo, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface OptionRow {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  isAvailable: boolean;
  position: number;
}

interface ProductRef {
  id: string;
  name: string;
}

interface GroupRow {
  id: string;
  name: string;
  internalName: string | null;
  description: string | null;
  isVariant: boolean;
  required: boolean;
  multiple: boolean;
  min: number;
  max: number | null;
  showIfOptionId: string | null;
  options: OptionRow[];
  complements: { product: ProductRef }[];
}

interface Props {
  initialGroups: GroupRow[];
}

// ─── Helper API ───────────────────────────────────────────────────────────────

async function apiFetch(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ComplementsManager({ initialGroups }: Props) {
  const [groups, setGroups]         = useState<GroupRow[]>(initialGroups);
  const [selectedId, setSelectedId] = useState<string | null>(initialGroups[0]?.id ?? null);
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Modal nuevo
  const [showNew, setShowNew]               = useState(false);
  const [newName, setNewName]               = useState("");
  const [newInternalName, setNewInternalName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMin, setNewMin]                 = useState(0);
  const [newMax, setNewMax]                 = useState<string>("1");
  const [creating, setCreating]             = useState(false);

  const filtered = useMemo(
    () => groups.filter(g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.internalName ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [groups, search]
  );

  const selected = groups.find(g => g.id === selectedId) ?? null;

  // ── Crear ──────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true); setError(null);
    const maxVal = newMax === "" ? null : parseInt(newMax);
    const minVal = newMin;
    const json = await apiFetch("/api/menu/groups", "POST", {
      name:         newName.trim(),
      internalName: newInternalName.trim() || null,
      description:  newDescription.trim() || null,
      min:          minVal,
      max:          maxVal,
      required:     minVal > 0,
      multiple:     maxVal === null || maxVal > 1,
    });
    setCreating(false);
    if (json.error) { setError(json.error); return; }
    const created: GroupRow = { ...json.data, complements: json.data.complements ?? [] };
    setGroups(prev => [...prev, created]);
    setSelectedId(created.id);
    setShowNew(false);
    setNewName(""); setNewInternalName(""); setNewDescription(""); setNewMin(0); setNewMax("1");
  }

  // ── Patch grupo ────────────────────────────────────────────────────────────

  async function patchGroup(patch: Partial<GroupRow>) {
    if (!selected) return;
    setSaving(true); setError(null);
    const json = await apiFetch(`/api/menu/groups/${selected.id}`, "PATCH", patch);
    setSaving(false);
    if (json.error) { setError(json.error); return; }
    setGroups(prev => prev.map(g => g.id === selected.id ? { ...g, ...json.data } : g));
  }

  // ── Eliminar grupo ─────────────────────────────────────────────────────────

  async function handleDeleteGroup() {
    if (!selected) return;
    if (!confirm(`¿Eliminar "${selected.name}"? Se quitará de todos los productos.`)) return;
    setSaving(true);
    await apiFetch(`/api/menu/groups/${selected.id}`, "DELETE");
    setSaving(false);
    const remaining = groups.filter(g => g.id !== selected.id);
    setGroups(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  }

  // ── Opciones ───────────────────────────────────────────────────────────────

  async function handleAddOption(name: string, description: string, price: number) {
    if (!selected || !name.trim()) return;
    const json = await apiFetch("/api/menu/options", "POST", {
      groupId:     selected.id,
      name:        name.trim(),
      description: description.trim() || null,
      price,
    });
    if (json.error) { setError(json.error); return; }
    setGroups(prev => prev.map(g =>
      g.id === selected.id ? { ...g, options: [...g.options, json.data] } : g
    ));
  }

  async function patchOption(
    optId: string,
    patch: { name?: string; description?: string | null; price?: number; isAvailable?: boolean }
  ) {
    const json = await apiFetch(`/api/menu/options/${optId}`, "PATCH", patch);
    if (json.error) { setError(json.error); return; }
    setGroups(prev => prev.map(g =>
      g.id === selectedId
        ? { ...g, options: g.options.map(o => o.id === optId ? { ...o, ...json.data } : o) }
        : g
    ));
  }

  async function handleDeleteOption(optId: string) {
    await apiFetch(`/api/menu/options/${optId}`, "DELETE");
    setGroups(prev => prev.map(g =>
      g.id === selectedId
        ? { ...g, options: g.options.filter(o => o.id !== optId) }
        : g
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "var(--font-dm)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 800, fontSize: 22, color: "var(--dash-text)", margin: 0 }}>
            Complementos
          </h1>
          <p style={{ fontSize: 13, color: "var(--dash-muted)", margin: "4px 0 0" }}>
            Grupos de opciones reutilizables entre productos
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--dash-orange)", border: "none", borderRadius: 10, color: "#fff", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          + Nuevo complemento
        </button>
      </div>

      {error && (
        <div style={{ background: "var(--dash-red-soft)", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "var(--dash-red)" }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "var(--dash-red)", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── Lista izquierda ─────────────────────────────────────── */}
        <div style={{ background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 12px 8px" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar complemento..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--dash-border)", borderRadius: 8, fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)", background: "var(--dash-canvas)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ padding: "20px 16px", fontSize: 13, color: "var(--dash-muted)", textAlign: "center" }}>
              {search ? "Sin resultados" : "Aún no tienes complementos"}
            </p>
          ) : (
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              {filtered.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedId(group.id)}
                  style={{
                    width: "100%", textAlign: "left", padding: "11px 14px",
                    border: "none", borderBottom: "1px solid var(--dash-border)",
                    background: group.id === selectedId ? "var(--dash-orange-soft)" : "transparent",
                    cursor: "pointer",
                    borderLeft: group.id === selectedId ? "3px solid var(--dash-orange)" : "3px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: group.id === selectedId ? "var(--dash-orange)" : "var(--dash-text)" }}>
                      {group.name}
                    </span>
                    {group.internalName && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6, background: "#EDE9FE", color: "#5B21B6" }}>
                        {group.internalName}
                      </span>
                    )}
                    {group.isVariant && (
                      <span title="Define el precio del producto" style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6, background: "#EDE9FE", color: "#7C3AED" }}>
                        precio
                      </span>
                    )}
                    {group.showIfOptionId && (
                      <span title="Visibilidad condicional" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "#FEF3C7", color: "#92400E" }}>
                        condicional
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dash-muted)" }}>
                    {group.options.length} opcion{group.options.length !== 1 ? "es" : ""}
                    {" · "}
                    {group.complements.length} producto{group.complements.length !== 1 ? "s" : ""}
                    {" · "}
                    {group.isVariant ? "define precio" : group.required ? "obligatorio" : "opcional"}
                    {!group.isVariant && " · "}
                    {!group.isVariant && (group.max === 1 ? "solo uno" : "múltiple")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Panel editor ────────────────────────────────────────── */}
        {selected ? (
          <GroupEditor
            group={selected}
            allGroups={groups}
            saving={saving}
            onPatchGroup={patchGroup}
            onDeleteGroup={handleDeleteGroup}
            onAddOption={handleAddOption}
            onPatchOption={patchOption}
            onDeleteOption={handleDeleteOption}
          />
        ) : (
          <div style={{ background: "var(--dash-surface)", border: "1px solid var(--dash-border)", borderRadius: 12, padding: 48, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--dash-muted)" }}>
              Selecciona un complemento para editarlo
            </p>
          </div>
        )}
      </div>

      {/* ── Modal nuevo complemento ───────────────────────────────── */}
      {showNew && (
        <div
          onClick={() => setShowNew(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}
          >
            <h2 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 18, color: "var(--dash-text)", margin: "0 0 20px" }}>
              Nuevo complemento
            </h2>

            <label style={labelStyle}>Nombre público *</label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="ej. Salsas, Tamaño, Extras..."
              style={inputStyle}
            />
            <p style={hintStyle}>Nombre que verá el cliente en el menú.</p>

            <label style={labelStyle}>Etiqueta interna (solo admin)</label>
            <input
              value={newInternalName}
              onChange={e => setNewInternalName(e.target.value)}
              placeholder="ej. Salsas para alitas..."
              style={inputStyle}
            />
            <p style={hintStyle}>Solo visible en el dashboard para diferenciar complementos con el mismo nombre.</p>

            <label style={labelStyle}>Descripción (visible al cliente)</label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="ej. Elige la salsa de tu preferencia"
              rows={2}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
            <p style={hintStyle}>Opcional. Se muestra debajo del título en el menú.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
              <div>
                <label style={labelStyle}>Mínimo de selecciones</label>
                <input
                  type="number" min={0}
                  value={newMin}
                  onChange={e => setNewMin(parseInt(e.target.value) || 0)}
                  style={inputStyle}
                />
                <p style={hintStyle}>0 = opcional</p>
              </div>
              <div>
                <label style={labelStyle}>Máximo (vacío = sin límite)</label>
                <input
                  type="number" min={1}
                  value={newMax}
                  onChange={e => setNewMax(e.target.value)}
                  placeholder="sin límite"
                  style={inputStyle}
                />
                <p style={hintStyle}>1 = selección única</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowNew(false)}
                style={{ flex: 1, padding: "11px 0", border: "1px solid var(--dash-border)", borderRadius: 10, background: "none", fontFamily: "var(--font-dm)", fontSize: 14, color: "var(--dash-muted)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 10, background: !newName.trim() || creating ? "#ccc" : "var(--dash-orange)", color: "#fff", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 14, cursor: !newName.trim() || creating ? "not-allowed" : "pointer" }}
              >
                {creating ? "Creando..." : "Crear complemento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editor del grupo ─────────────────────────────────────────────────────────

function GroupEditor({
  group, allGroups, saving,
  onPatchGroup, onDeleteGroup,
  onAddOption, onPatchOption, onDeleteOption,
}: {
  group: GroupRow;
  allGroups: GroupRow[];
  saving: boolean;
  onPatchGroup: (patch: Partial<GroupRow>) => void;
  onDeleteGroup: () => void;
  onAddOption: (name: string, description: string, price: number) => void;
  onPatchOption: (id: string, patch: { name?: string; description?: string | null; price?: number; isAvailable?: boolean }) => void;
  onDeleteOption: (id: string) => void;
}) {
  const [name, setName]               = useState(group.name);
  const [internalName, setInternalName] = useState(group.internalName ?? "");
  const [description, setDescription] = useState(group.description ?? "");
  const [isVariant, setIsVariant]     = useState(group.isVariant);
  const [min, setMin]                 = useState(String(group.min));
  const [max, setMax]                 = useState(group.max === null ? "" : String(group.max));
  const [showIfOptionId, setShowIfOptionId] = useState(group.showIfOptionId ?? "");

  // Nueva opción
  const [newOptName, setNewOptName]         = useState("");
  const [newOptDesc, setNewOptDesc]         = useState("");
  const [newOptPrice, setNewOptPrice]       = useState("0");
  const [addingOpt, setAddingOpt]           = useState(false);
  const [showOptDesc, setShowOptDesc]       = useState(false);

  // Edición inline de opción
  const [editingOptId, setEditingOptId]     = useState<string | null>(null);
  const [editOptName, setEditOptName]       = useState("");
  const [editOptDesc, setEditOptDesc]       = useState("");
  const [editOptPrice, setEditOptPrice]     = useState("");

  useEffect(() => {
    setName(group.name);
    setInternalName(group.internalName ?? "");
    setDescription(group.description ?? "");
    setIsVariant(group.isVariant);
    setMin(String(group.min));
    setMax(group.max === null ? "" : String(group.max));
    setShowIfOptionId(group.showIfOptionId ?? "");
    setEditingOptId(null);
  }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derivados
  const minVal = parseInt(min || "0");
  const maxVal = max === "" ? null : parseInt(max);
  const isRequired = minVal > 0;
  const isMultiple = maxVal === null || maxVal > 1;

  function toggleRequired() {
    if (isRequired) setMin("0");
    else { setMin("1"); if (!isMultiple && maxVal !== null && maxVal < 1) setMax("1"); }
  }
  function toggleMultiple() {
    if (isMultiple) { setMax("1"); if (minVal > 1) setMin("1"); }
    else setMax("");
  }
  function toggleIsVariant() {
    const next = !isVariant;
    setIsVariant(next);
    if (next) {
      // isVariant fuerza: una sola selección obligatoria
      setMin("1");
      setMax("1");
    }
  }

  const isDirty =
    name !== group.name ||
    internalName !== (group.internalName ?? "") ||
    description !== (group.description ?? "") ||
    isVariant !== group.isVariant ||
    minVal !== group.min ||
    maxVal !== group.max ||
    (showIfOptionId || null) !== group.showIfOptionId;

  function handleSave() {
    const mv = isVariant ? 1 : parseInt(min || "0");
    const xv = isVariant ? 1 : (max === "" ? null : parseInt(max));
    onPatchGroup({
      name:           name.trim(),
      internalName:   internalName.trim() || null,
      description:    description.trim() || null,
      isVariant,
      min:            mv,
      max:            xv,
      required:       isVariant ? true : mv > 0,
      multiple:       isVariant ? false : (xv === null || xv > 1),
      showIfOptionId: showIfOptionId || null,
    });
  }

  async function handleAddOpt() {
    if (!newOptName.trim()) return;
    setAddingOpt(true);
    await onAddOption(newOptName.trim(), newOptDesc, parseFloat(newOptPrice) || 0);
    setAddingOpt(false);
    setNewOptName(""); setNewOptDesc(""); setNewOptPrice("0"); setShowOptDesc(false);
  }

  function startEdit(opt: OptionRow) {
    setEditingOptId(opt.id);
    setEditOptName(opt.name);
    setEditOptDesc(opt.description ?? "");
    setEditOptPrice(String(opt.price));
  }

  function saveEdit(opt: OptionRow) {
    onPatchOption(opt.id, {
      name:        editOptName.trim(),
      description: editOptDesc.trim() || null,
      price:       parseFloat(editOptPrice) || 0,
    });
    setEditingOptId(null);
  }

  // Opciones disponibles de otros grupos para visibilidad condicional
  const conditionalOptions = allGroups
    .filter(g => g.id !== group.id)
    .flatMap(g => g.options.map(o => ({ optionId: o.id, optionName: o.name, groupName: g.name })));

  const products = group.complements.map(c => c.product);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Card: identidad ──────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ ...sectionTitle, margin: 0 }}>Identidad del complemento</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              style={{ padding: "8px 16px", background: isDirty && !saving ? "var(--dash-orange)" : "var(--dash-border)", border: "none", borderRadius: 8, fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, color: isDirty && !saving ? "#fff" : "var(--dash-muted)", cursor: isDirty && !saving ? "pointer" : "default", transition: "all 0.15s" }}
            >
              {saving ? "Guardando..." : isDirty ? "Guardar cambios" : "Guardado"}
            </button>
            <button
              onClick={onDeleteGroup}
              style={{ padding: "8px 12px", background: "none", border: "1px solid var(--dash-border)", borderRadius: 8, color: "var(--dash-red)", cursor: "pointer", fontSize: 13 }}
            >
              Eliminar
            </button>
          </div>
        </div>

        <label style={labelStyle}>Nombre público *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ej. Salsas, Tamaño, Extras..."
          style={{ ...inputStyle, fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 15 }}
        />
        <p style={hintStyle}>Nombre que verá el cliente en el menú.</p>

        <label style={labelStyle}>Etiqueta interna (solo admin)</label>
        <input
          value={internalName}
          onChange={e => setInternalName(e.target.value)}
          placeholder="ej. Salsas para alitas, Salsas para burger..."
          style={{ ...inputStyle, color: "#5B21B6" }}
        />
        <p style={hintStyle}>Solo visible en el dashboard para diferenciar complementos con el mismo nombre público.</p>

        <label style={labelStyle}>Descripción (visible al cliente)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="ej. Elige la salsa de tu preferencia (opcional)"
          rows={2}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
        <p style={{ ...hintStyle, margin: 0 }}>Opcional. Se muestra debajo del título en el menú.</p>
      </div>

      {/* ── Card: comportamiento de selección ────────────────────── */}
      <div style={cardStyle}>
        <p style={sectionTitle}>Comportamiento de selección</p>

        {/* Toggle: Define el precio (isVariant) — destacado */}
        <button
          onClick={toggleIsVariant}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "12px 14px", borderRadius: 10, marginBottom: 14,
            border: `2px solid ${isVariant ? "#7C3AED" : "var(--dash-border)"}`,
            background: isVariant ? "#EDE9FE" : "transparent",
            cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 13, textAlign: "left",
            transition: "all 0.15s",
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
            border: `2px solid ${isVariant ? "#7C3AED" : "var(--dash-muted)"}`,
            background: isVariant ? "#7C3AED" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {isVariant && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
          </span>
          <div>
            <span style={{ fontWeight: 700, color: isVariant ? "#5B21B6" : "var(--dash-text)", display: "block" }}>
              Define el precio del producto
            </span>
            <span style={{ fontSize: 11, color: isVariant ? "#7C3AED" : "var(--dash-muted)" }}>
              {isVariant
                ? "La opción que elija el cliente reemplaza el precio base del producto (ej. Cantidad de alitas, Tamaño de pizza)"
                : "Activa esto si la opción no es un extra sino que establece el precio final (ej. 6 piezas = $99, 12 piezas = $159)"}
            </span>
          </div>
        </button>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {/* Toggle: Obligatorio */}
          <button
            onClick={toggleRequired}
            disabled={isVariant}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px", borderRadius: 10,
              border: `1.5px solid ${isVariant ? "var(--dash-border)" : isRequired ? "var(--dash-orange)" : "var(--dash-border)"}`,
              background: isVariant ? "transparent" : isRequired ? "var(--dash-orange-soft)" : "transparent",
              cursor: isVariant ? "not-allowed" : "pointer",
              fontFamily: "var(--font-dm)", fontSize: 13, transition: "all 0.15s",
              opacity: isVariant ? 0.5 : 1,
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
              border: `2px solid ${(isVariant || isRequired) ? "var(--dash-orange)" : "var(--dash-muted)"}`,
              background: (isVariant || isRequired) ? "var(--dash-orange)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {(isVariant || isRequired) && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
            </span>
            <span style={{ fontWeight: 600, color: (isVariant || isRequired) ? "var(--dash-orange)" : "var(--dash-text)" }}>
              Obligatorio
            </span>
          </button>

          {/* Toggle: Selección múltiple */}
          <button
            onClick={toggleMultiple}
            disabled={isVariant}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px", borderRadius: 10,
              border: `1.5px solid ${isVariant ? "var(--dash-border)" : isMultiple ? "var(--dash-orange)" : "var(--dash-border)"}`,
              background: isVariant ? "transparent" : isMultiple ? "var(--dash-orange-soft)" : "transparent",
              cursor: isVariant ? "not-allowed" : "pointer",
              fontFamily: "var(--font-dm)", fontSize: 13, transition: "all 0.15s",
              opacity: isVariant ? 0.5 : 1,
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${(!isVariant && isMultiple) ? "var(--dash-orange)" : "var(--dash-muted)"}`,
              background: (!isVariant && isMultiple) ? "var(--dash-orange)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {(!isVariant && isMultiple) && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
            </span>
            <span style={{ fontWeight: 600, color: (!isVariant && isMultiple) ? "var(--dash-orange)" : "var(--dash-text)" }}>
              Selección múltiple
            </span>
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--dash-muted)", marginBottom: 14, lineHeight: 1.5 }}>
          {!isRequired && !isMultiple && "El cliente elige una sola opción (o puede omitirla)."}
          {!isRequired && isMultiple && "El cliente puede elegir varias opciones o ninguna."}
          {isRequired && !isMultiple && "El cliente debe elegir exactamente una opción."}
          {isRequired && isMultiple && "El cliente debe elegir al menos una opción (puede elegir varias)."}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Mínimo de selecciones</label>
            <input
              type="number" min={0}
              value={min}
              onChange={e => setMin(e.target.value)}
              style={inputStyle}
            />
            <p style={hintStyle}>0 = no obligatorio</p>
          </div>
          <div>
            <label style={labelStyle}>Máximo (vacío = sin límite)</label>
            <input
              type="number" min={1}
              value={max}
              onChange={e => setMax(e.target.value)}
              placeholder="∞ sin límite"
              style={inputStyle}
            />
            <p style={hintStyle}>1 = solo permite elegir uno</p>
          </div>
        </div>
      </div>

      {/* ── Card: visibilidad condicional ─────────────────────────── */}
      {conditionalOptions.length > 0 && (
        <div style={cardStyle}>
          <p style={sectionTitle}>Visibilidad condicional</p>
          <p style={{ fontSize: 12, color: "var(--dash-muted)", marginBottom: 10, lineHeight: 1.5 }}>
            Muestra este grupo solo cuando el cliente haya seleccionado una opción específica de otro grupo.
            Útil para complementos que dependen de una elección previa (ej. "Tipo de cocción" solo aparece si eligió "Carne").
          </p>
          <label style={labelStyle}>Solo visible si el cliente elige</label>
          <select
            value={showIfOptionId}
            onChange={e => setShowIfOptionId(e.target.value)}
            style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32, cursor: "pointer" }}
          >
            <option value="">— Siempre visible —</option>
            {conditionalOptions.map(o => (
              <option key={o.optionId} value={o.optionId}>
                {o.optionName}  ({o.groupName})
              </option>
            ))}
          </select>
          {showIfOptionId && (
            <p style={{ fontSize: 12, color: "#92400E", marginTop: 6, background: "#FEF3C7", padding: "6px 10px", borderRadius: 6 }}>
              Este grupo solo se mostrará si el cliente elige la opción indicada.
            </p>
          )}
        </div>
      )}

      {/* ── Card: opciones ───────────────────────────────────────── */}
      <div style={cardStyle}>
        <p style={sectionTitle}>
          Opciones
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--dash-muted)", marginLeft: 8 }}>
            ({group.options.length} total)
          </span>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {group.options.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--dash-muted)", textAlign: "center", padding: "16px 0" }}>
              Sin opciones aún. Agrega la primera abajo.
            </p>
          )}

          {group.options.map(opt => (
            <div
              key={opt.id}
              style={{
                border: `1px solid ${!opt.isAvailable ? "#FECACA" : "var(--dash-border)"}`,
                borderRadius: 10,
                background: !opt.isAvailable ? "#FFF5F5" : "var(--dash-canvas)",
                overflow: "hidden",
              }}
            >
              {editingOptId === opt.id ? (
                /* Modo edición */
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={editOptName}
                      onChange={e => setEditOptName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit(opt)}
                      placeholder="Nombre de la opción"
                      style={{ ...inputStyle, flex: 1, margin: 0 }}
                      autoFocus
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, color: "var(--dash-muted)" }}>$</span>
                      <input
                        type="number" min={0} step={0.5}
                        value={editOptPrice}
                        onChange={e => setEditOptPrice(e.target.value)}
                        style={{ ...inputStyle, width: 80, margin: 0 }}
                      />
                    </div>
                    <button onClick={() => saveEdit(opt)} style={{ padding: "8px 14px", background: "var(--dash-orange)", border: "none", borderRadius: 8, color: "#fff", fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      Guardar
                    </button>
                    <button onClick={() => setEditingOptId(null)} style={{ padding: "8px 10px", background: "none", border: "1px solid var(--dash-border)", borderRadius: 8, fontSize: 12, color: "var(--dash-muted)", cursor: "pointer", flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                  <input
                    value={editOptDesc}
                    onChange={e => setEditOptDesc(e.target.value)}
                    placeholder="Descripción (opcional, visible al cliente)"
                    style={{ ...inputStyle, margin: 0, fontSize: 12 }}
                  />
                </div>
              ) : (
                /* Modo vista */
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: opt.isAvailable ? "var(--dash-text)" : "var(--dash-muted)", textDecoration: opt.isAvailable ? "none" : "line-through", fontWeight: 500 }}>
                      {opt.name}
                    </span>
                    {opt.description && (
                      <p style={{ fontSize: 11, color: "var(--dash-muted)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {opt.description}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dash-orange)", minWidth: 56, textAlign: "right", flexShrink: 0 }}>
                    {Number(opt.price) > 0 ? `+${formatCurrency(Number(opt.price))}` : "—"}
                  </span>
                  {/* Toggle disponibilidad */}
                  <button
                    onClick={() => onPatchOption(opt.id, { isAvailable: !opt.isAvailable })}
                    title={opt.isAvailable ? "Marcar agotado" : "Marcar disponible"}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: opt.isAvailable ? "var(--dash-green-soft)" : "var(--dash-red-soft)", color: opt.isAvailable ? "var(--dash-green)" : "var(--dash-red)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    {opt.isAvailable ? "✓" : "✕"}
                  </button>
                  <button
                    onClick={() => startEdit(opt)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--dash-border)", background: "none", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar la opción "${opt.name}"?`)) onDeleteOption(opt.id); }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--dash-red-soft)", color: "var(--dash-red)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Agregar nueva opción ─────────────────────────────────── */}
        <div style={{ border: "1.5px dashed var(--dash-border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px" }}>
            <input
              value={newOptName}
              onChange={e => setNewOptName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAddOpt()}
              placeholder="Nombre de la opción"
              style={{ flex: 1, border: "none", background: "transparent", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)", outline: "none" }}
            />
            <span style={{ fontSize: 13, color: "var(--dash-muted)" }}>$</span>
            <input
              type="number" min={0} step={0.5}
              value={newOptPrice}
              onChange={e => setNewOptPrice(e.target.value)}
              style={{ width: 70, border: "none", background: "transparent", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)", outline: "none" }}
            />
            <button
              onClick={() => setShowOptDesc(s => !s)}
              title="Agregar descripción"
              style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--dash-border)", background: showOptDesc ? "var(--dash-orange-soft)" : "none", cursor: "pointer", fontSize: 12, color: showOptDesc ? "var(--dash-orange)" : "var(--dash-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              ¶
            </button>
            <button
              onClick={handleAddOpt}
              disabled={!newOptName.trim() || addingOpt}
              style={{ padding: "6px 14px", background: !newOptName.trim() || addingOpt ? "var(--dash-border)" : "var(--dash-orange)", border: "none", borderRadius: 8, color: !newOptName.trim() || addingOpt ? "var(--dash-muted)" : "#fff", fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, cursor: !newOptName.trim() || addingOpt ? "default" : "pointer", flexShrink: 0 }}
            >
              + Agregar
            </button>
          </div>
          {showOptDesc && (
            <div style={{ padding: "0 14px 10px", borderTop: "1px solid var(--dash-border)" }}>
              <input
                value={newOptDesc}
                onChange={e => setNewOptDesc(e.target.value)}
                placeholder="Descripción de la opción (visible al cliente)"
                style={{ width: "100%", border: "none", background: "transparent", fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-text)", outline: "none", paddingTop: 8, boxSizing: "border-box" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Productos que usan este complemento ──────────────────── */}
      {products.length > 0 && (
        <div style={cardStyle}>
          <p style={sectionTitle}>
            Productos que usan este complemento
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--dash-muted)", marginLeft: 8 }}>({products.length})</span>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {products.map(p => (
              <span key={p.id} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "var(--dash-canvas)", border: "1px solid var(--dash-border)", color: "var(--dash-text)" }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--dash-surface)",
  border: "1px solid var(--dash-border)",
  borderRadius: 12,
  padding: "18px 20px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--dash-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 14,
  marginTop: 0,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--dash-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--dash-border)",
  borderRadius: 8,
  fontFamily: "var(--font-dm)",
  fontSize: 13,
  color: "var(--dash-text)",
  background: "var(--dash-canvas)",
  outline: "none",
  boxSizing: "border-box",
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--dash-muted)",
  margin: "4px 0 12px",
};
