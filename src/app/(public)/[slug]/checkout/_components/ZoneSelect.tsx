"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import type { DeliveryZone } from "@prisma/client";

interface Props {
  zones: DeliveryZone[];
  value: string;           // id de la zona seleccionada
  onChange: (id: string) => void;
}

export function ZoneSelect({ zones, value, onChange }: Props) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const containerRef        = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);

  const selected = zones.find(z => z.id === value) ?? null;

  // Filtrar por nombre (insensible a mayúsculas/acentos)
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = query.trim()
    ? zones.filter(z => normalize(z.name).includes(normalize(query)))
    : zones;

  // Cerrar al hacer click fuera
  const handleOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setQuery("");
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [handleOutside]);

  // Enfocar buscador al abrir
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12,
          border: open
            ? "2px solid var(--menu-accent)"
            : value
              ? "2px solid var(--menu-accent)"
              : "2px solid var(--menu-border)",
          background: value ? "var(--menu-accent-soft, #fff7ed)" : "#fff",
          cursor: "pointer",
          textAlign: "left",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 14, color: "var(--menu-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selected.name}
              </p>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-accent)", margin: "2px 0 0", fontWeight: 600 }}>
                {Number(selected.cost) === 0 ? "Sin costo de envío" : `Envío: ${formatCurrency(Number(selected.cost))}`}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, color: "#9ca3af", margin: 0 }}>
              Selecciona tu zona de entrega…
            </p>
          )}
        </div>

        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M3 6l5 5 5-5" stroke="var(--menu-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#fff",
          border: "1.5px solid var(--menu-border)",
          borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          overflow: "hidden",
          animation: "dropIn 0.15s ease",
        }}>
          <style>{`
            @keyframes dropIn {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Buscador */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--menu-border)" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
                style={{ position: "absolute", left: 10, flexShrink: 0, pointerEvents: "none" }}>
                <circle cx="9" cy="9" r="6" stroke="#9ca3af" strokeWidth="1.8" />
                <path d="M13.5 13.5L17 17" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar colonia o zona…"
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 32px",
                  border: "1.5px solid var(--menu-border)",
                  borderRadius: 8,
                  fontFamily: "var(--font-dm)",
                  fontSize: 13,
                  color: "var(--menu-primary)",
                  background: "#fafafa",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 2 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 260, overflowY: "auto", padding: "6px 0" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  Sin resultados para "{query}"
                </p>
              </div>
            ) : (
              filtered.map(zone => {
                const isSelected = zone.id === value;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => select(zone.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 14px",
                      background: isSelected ? "var(--menu-accent-soft, #fff7ed)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    {/* Texto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: "var(--font-dm)",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: 13,
                        color: isSelected ? "var(--menu-accent)" : "var(--menu-primary)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {highlight(zone.name, query)}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-dm)",
                        fontSize: 11,
                        color: isSelected ? "var(--menu-accent)" : "var(--menu-muted)",
                        margin: "2px 0 0",
                      }}>
                        {Number(zone.cost) === 0 ? "Sin costo de envío" : `Costo de envío: ${formatCurrency(Number(zone.cost))}`}
                      </p>
                    </div>

                    {/* Check */}
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="8" cy="8" r="7.5" fill="var(--menu-accent)" />
                        <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Contador */}
          {zones.length > 5 && (
            <div style={{ padding: "8px 14px", borderTop: "1px solid var(--menu-border)", background: "#fafafa" }}>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "#9ca3af", margin: 0 }}>
                {filtered.length} de {zones.length} zonas
                {query ? ` — filtrando por "${query}"` : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Resalta el texto buscado en el nombre de la zona
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const idx = normalize(text).indexOf(normalize(query));
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#fef08a", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
