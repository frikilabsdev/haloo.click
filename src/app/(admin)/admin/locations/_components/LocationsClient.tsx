"use client";

import { useState } from "react";

interface City {
  id:       string;
  name:     string;
  slug:     string;
  isActive: boolean;
  _count?:  { tenants: number };
}

interface StateRow {
  id:       string;
  name:     string;
  slug:     string;
  order:    number;
  isActive: boolean;
  cities:   City[];
  _count:   { tenants: number };
}

const s = {
  btn: {
    fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600,
    padding: "6px 14px", borderRadius: 7, border: "none",
    cursor: "pointer", transition: "opacity 0.15s",
  } as React.CSSProperties,
  input: {
    width: "100%", boxSizing: "border-box" as const,
    background: "#0F172A", border: "1px solid #334155", borderRadius: 8,
    color: "#F8FAFC", fontFamily: "var(--font-dm)", fontSize: 13,
    padding: "9px 12px", outline: "none",
  } as React.CSSProperties,
  card: {
    background: "#1E293B", border: "1px solid #334155",
    borderRadius: 12, overflow: "hidden",
  } as React.CSSProperties,
};

export function LocationsClient({ initialStates }: { initialStates: StateRow[] }) {
  const [states,      setStates]      = useState<StateRow[]>(initialStates);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [newState,    setNewState]    = useState("");
  const [addingState, setAddingState] = useState(false);
  const [newCity,     setNewCity]     = useState("");
  const [addingCity,  setAddingCity]  = useState<string | null>(null); // stateId
  const [editStateId, setEditStateId] = useState<string | null>(null);
  const [editStateName, setEditStateName] = useState("");
  const [editCityId,  setEditCityId]  = useState<string | null>(null);
  const [editCityName, setEditCityName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function apiFetch(url: string, opts?: RequestInit) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Error");
    return json;
  }

  // ── Estados ──────────────────────────────────────────────────────────────────

  async function createState() {
    if (!newState.trim()) return;
    setBusy(true); setError("");
    try {
      const { data } = await apiFetch("/api/admin/locations/states", {
        method: "POST",
        body: JSON.stringify({ name: newState.trim() }),
      });
      setStates(prev => [...prev, { ...data, cities: [], _count: { tenants: 0 } }]);
      setNewState("");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStateActive(st: StateRow) {
    setBusy(true); setError("");
    try {
      const { data } = await apiFetch(`/api/admin/locations/states/${st.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !st.isActive }),
      });
      setStates(prev => prev.map(s => s.id === st.id ? { ...s, isActive: data.isActive } : s));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveStateName(st: StateRow) {
    if (!editStateName.trim()) return;
    setBusy(true); setError("");
    try {
      const { data } = await apiFetch(`/api/admin/locations/states/${st.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editStateName.trim() }),
      });
      setStates(prev => prev.map(s => s.id === st.id ? { ...s, name: data.name, slug: data.slug } : s));
      setEditStateId(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteState(st: StateRow) {
    if (!confirm(`¿Eliminar "${st.name}" y todas sus ciudades? Los restaurantes perderán la ubicación.`)) return;
    setBusy(true); setError("");
    try {
      await apiFetch(`/api/admin/locations/states/${st.id}`, { method: "DELETE" });
      setStates(prev => prev.filter(s => s.id !== st.id));
      if (expanded === st.id) setExpanded(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Ciudades ──────────────────────────────────────────────────────────────────

  async function createCity(stateId: string) {
    if (!newCity.trim()) return;
    setBusy(true); setError("");
    try {
      const { data } = await apiFetch("/api/admin/locations/cities", {
        method: "POST",
        body: JSON.stringify({ name: newCity.trim(), stateId }),
      });
      setStates(prev => prev.map(st =>
        st.id === stateId
          ? { ...st, cities: [...st.cities, data].sort((a, b) => a.name.localeCompare(b.name)) }
          : st
      ));
      setNewCity("");
      setAddingCity(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleCityActive(stateId: string, city: City) {
    setBusy(true); setError("");
    try {
      const { data } = await apiFetch(`/api/admin/locations/cities/${city.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !city.isActive }),
      });
      setStates(prev => prev.map(st =>
        st.id === stateId
          ? { ...st, cities: st.cities.map(c => c.id === city.id ? { ...c, isActive: data.isActive } : c) }
          : st
      ));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCityName(stateId: string, city: City) {
    if (!editCityName.trim()) return;
    setBusy(true); setError("");
    try {
      const { data } = await apiFetch(`/api/admin/locations/cities/${city.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editCityName.trim() }),
      });
      setStates(prev => prev.map(st =>
        st.id === stateId
          ? { ...st, cities: st.cities.map(c => c.id === city.id ? { ...c, name: data.name, slug: data.slug } : c) }
          : st
      ));
      setEditCityId(null);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCity(stateId: string, city: City) {
    if (!confirm(`¿Eliminar "${city.name}"? Los restaurantes perderán esta ciudad.`)) return;
    setBusy(true); setError("");
    try {
      await apiFetch(`/api/admin/locations/cities/${city.id}`, { method: "DELETE" });
      setStates(prev => prev.map(st =>
        st.id === stateId
          ? { ...st, cities: st.cities.filter(c => c.id !== city.id) }
          : st
      ));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 22, color: "#F8FAFC", margin: "0 0 4px" }}>
            Ubicaciones
          </h1>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#94A3B8", margin: 0 }}>
            Gestiona estados y ciudades disponibles en la plataforma
          </p>
        </div>
        <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#94A3B8" }}>
          {states.length} estado{states.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div style={{ background: "#450A0A", border: "1px solid #991B1B", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: "var(--font-dm)", fontSize: 13, color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {/* Agregar estado */}
      <div style={{ ...s.card, marginBottom: 20, padding: 16 }}>
        <p style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 13, color: "#94A3B8", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Nuevo estado
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newState}
            onChange={e => setNewState(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createState()}
            placeholder="Ej: Chiapas"
            style={{ ...s.input, flex: 1 }}
          />
          <button
            onClick={createState}
            disabled={busy || !newState.trim()}
            style={{ ...s.btn, background: "#F4721E", color: "#fff", opacity: busy || !newState.trim() ? 0.5 : 1 }}
          >
            {addingState ? "…" : "Agregar"}
          </button>
          {/* suppress unused var warning */}
          <span style={{ display: "none" }}>{addingState ? "t" : ""}</span>
        </div>
      </div>

      {/* Lista de estados */}
      {states.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#475569", fontFamily: "var(--font-dm)", fontSize: 14 }}>
          No hay estados. Agrega el primero arriba.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {states.map(st => (
            <div key={st.id} style={s.card}>
              {/* Fila del estado */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(expanded === st.id ? null : st.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
                >
                  {expanded === st.id ? "▾" : "▸"}
                </button>

                {/* Nombre editable */}
                {editStateId === st.id ? (
                  <input
                    value={editStateName}
                    onChange={e => setEditStateName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveStateName(st); if (e.key === "Escape") setEditStateId(null); }}
                    onBlur={() => saveStateName(st)}
                    autoFocus
                    style={{ ...s.input, flex: 1, padding: "5px 10px", fontSize: 14 }}
                  />
                ) : (
                  <span
                    onClick={() => { setEditStateId(st.id); setEditStateName(st.name); }}
                    style={{ flex: 1, fontFamily: "var(--font-dm)", fontSize: 14, fontWeight: 600, color: st.isActive ? "#F8FAFC" : "#64748B", cursor: "pointer" }}
                    title="Clic para editar"
                  >
                    {st.name}
                  </span>
                )}

                {/* Badges */}
                <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "#64748B" }}>
                  {st.cities.length} ciudad{st.cities.length !== 1 ? "es" : ""}
                </span>
                {st._count.tenants > 0 && (
                  <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, background: "#1E3A5F", color: "#93C5FD", padding: "2px 8px", borderRadius: 99 }}>
                    {st._count.tenants} rest.
                  </span>
                )}
                <span style={{
                  fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600,
                  padding: "2px 8px", borderRadius: 99,
                  background: st.isActive ? "#064E3B" : "#1E293B",
                  color:      st.isActive ? "#6EE7B7" : "#64748B",
                }}>
                  {st.isActive ? "Activo" : "Inactivo"}
                </span>

                {/* Acciones */}
                <button
                  onClick={() => toggleStateActive(st)}
                  disabled={busy}
                  style={{ ...s.btn, background: "#334155", color: "#CBD5E1", fontSize: 11 }}
                >
                  {st.isActive ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => deleteState(st)}
                  disabled={busy}
                  style={{ ...s.btn, background: "transparent", color: "#EF4444", border: "1px solid #7F1D1D", fontSize: 11 }}
                >
                  Eliminar
                </button>
              </div>

              {/* Panel de ciudades (expandible) */}
              {expanded === st.id && (
                <div style={{ borderTop: "1px solid #334155", padding: "12px 16px 16px" }}>
                  {/* Ciudades existentes */}
                  {st.cities.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "#475569", margin: "0 0 12px" }}>
                      Sin ciudades todavía.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                      {st.cities.map(city => (
                        <div key={city.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "#0F172A", borderRadius: 8 }}>
                          {editCityId === city.id ? (
                            <input
                              value={editCityName}
                              onChange={e => setEditCityName(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveCityName(st.id, city); if (e.key === "Escape") setEditCityId(null); }}
                              onBlur={() => saveCityName(st.id, city)}
                              autoFocus
                              style={{ ...s.input, flex: 1, padding: "4px 8px", fontSize: 12 }}
                            />
                          ) : (
                            <span
                              onClick={() => { setEditCityId(city.id); setEditCityName(city.name); }}
                              style={{ flex: 1, fontFamily: "var(--font-dm)", fontSize: 13, color: city.isActive ? "#E2E8F0" : "#64748B", cursor: "pointer" }}
                              title="Clic para editar"
                            >
                              {city.name}
                            </span>
                          )}
                          <span style={{
                            fontFamily: "var(--font-dm)", fontSize: 10, fontWeight: 600,
                            padding: "1px 7px", borderRadius: 99,
                            background: city.isActive ? "#064E3B" : "#1E293B",
                            color:      city.isActive ? "#6EE7B7" : "#64748B",
                          }}>
                            {city.isActive ? "Activa" : "Inactiva"}
                          </span>
                          <button onClick={() => toggleCityActive(st.id, city)} disabled={busy}
                            style={{ ...s.btn, background: "#1E293B", color: "#94A3B8", fontSize: 10, padding: "3px 9px" }}>
                            {city.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button onClick={() => deleteCity(st.id, city)} disabled={busy}
                            style={{ ...s.btn, background: "transparent", color: "#EF4444", border: "1px solid #450A0A", fontSize: 10, padding: "3px 9px" }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Agregar ciudad */}
                  {addingCity === st.id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={newCity}
                        onChange={e => setNewCity(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createCity(st.id); if (e.key === "Escape") { setAddingCity(null); setNewCity(""); } }}
                        placeholder="Nombre de la ciudad"
                        autoFocus
                        style={{ ...s.input, flex: 1, fontSize: 12, padding: "7px 10px" }}
                      />
                      <button onClick={() => createCity(st.id)} disabled={busy || !newCity.trim()}
                        style={{ ...s.btn, background: "#F4721E", color: "#fff", opacity: busy || !newCity.trim() ? 0.5 : 1 }}>
                        Agregar
                      </button>
                      <button onClick={() => { setAddingCity(null); setNewCity(""); }}
                        style={{ ...s.btn, background: "transparent", color: "#94A3B8", border: "1px solid #334155" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingCity(st.id); setNewCity(""); }}
                      style={{ ...s.btn, background: "#1E293B", color: "#94A3B8", border: "1px solid #334155" }}
                    >
                      + Agregar ciudad
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* suppress unused var */}
      <span style={{ display: "none" }}>{addingState ? "x" : ""}</span>
    </div>
  );
}
