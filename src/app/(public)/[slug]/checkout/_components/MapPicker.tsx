"use client";

import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Ícono pin personalizado (sin depender de archivos PNG de leaflet) ──────────

const PIN_ICON = L.divIcon({
  html: `
    <div style="position:relative;width:28px;height:36px">
      <div style="
        width:22px;height:22px;
        background:#F4721E;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        position:absolute;top:0;left:3px
      "></div>
    </div>`,
  className: "",
  iconSize:   [28, 36],
  iconAnchor: [14, 34],
});

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PickResult {
  lat:     number;
  lng:     number;
  address: string;
}

interface Props {
  onPick: (r: PickResult) => void;
  initialQuery?: string;
}

// ── Coordenadas por defecto: CDMX ─────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];

// ── Subcomponentes Leaflet (deben estar dentro de MapContainer) ───────────────

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function FlyToTarget({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 17, { duration: 1 });
  }, [map, target]);
  return null;
}

function DraggableMarker({
  pos, onMove,
}: {
  pos: [number, number];
  onMove: (lat: number, lng: number) => void;
}) {
  return (
    <Marker
      position={pos}
      icon={PIN_ICON}
      draggable
      eventHandlers={{
        dragend: e => {
          const { lat, lng } = e.target.getLatLng();
          onMove(lat, lng);
        },
      }}
    />
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function MapPicker({ onPick, initialQuery }: Props) {
  const [pos,          setPos]          = useState<[number, number]>(DEFAULT_CENTER);
  const [flyTarget,    setFlyTarget]    = useState<[number, number] | null>(null);
  const [geocoding,    setGeocoding]    = useState(false);
  const [locating,     setLocating]     = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [displayAddr,  setDisplayAddr]  = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // ── Reverse geocode con Nominatim ──────────────────────────────────────────

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
        { headers: { "User-Agent": "HalooMenuApp/1.0" } }
      );
      const data = await res.json();

      // Construir dirección legible: calle + número + colonia + ciudad
      const a = data.address ?? {};
      const parts = [
        a.road        && `${a.road}${a.house_number ? " " + a.house_number : ""}`,
        a.suburb      || a.neighbourhood || a.district,
        a.city        || a.town          || a.village,
      ].filter(Boolean);

      const addr = parts.length ? parts.join(", ") : (data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setDisplayAddr(addr);
      onPick({ lat, lng, address: addr });
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setDisplayAddr(fallback);
      onPick({ lat, lng, address: fallback });
    } finally {
      setGeocoding(false);
    }
  }, [onPick]);

  // ── Centrar mapa inicialmente cerca del restaurante (si hay ubicación) ─────
  useEffect(() => {
    const query = initialQuery?.trim();
    if (!query) return;

    let cancelled = false;
    const cacheKey = `haloo_restaurant_center_${query.toLowerCase()}`;

    const resolveInitialCenter = async () => {
      setBootstrapping(true);

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { lat?: number; lng?: number };
          if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
            const target: [number, number] = [parsed.lat, parsed.lng];
            if (!cancelled) {
              setPos(target);
              setFlyTarget(target);
              reverseGeocode(parsed.lat, parsed.lng);
            }
            return;
          }
        }
      } catch {
        // Ignorar errores de cache y continuar con geocodificación
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=es`
        );
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : null;
        const lat = first ? Number(first.lat) : NaN;
        const lng = first ? Number(first.lon) : NaN;

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || cancelled) return;

        const target: [number, number] = [lat, lng];
        setPos(target);
        setFlyTarget(target);
        reverseGeocode(lat, lng);

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
        } catch {
          // Ignorar errores de localStorage
        }
      } catch {
        // Si falla Nominatim, mantener centro por defecto
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    resolveInitialCenter();
    return () => { cancelled = true; };
  }, [initialQuery, reverseGeocode]);

  // ── Mover marcador ────────────────────────────────────────────────────────

  const handleMove = useCallback((lat: number, lng: number) => {
    setPos([lat, lng]);
    setHasInteracted(true);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // ── Geolocalización ───────────────────────────────────────────────────────

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        const target: [number, number] = [lat, lng];
        setPos(target);
        setFlyTarget(target);
        setHasInteracted(true);
        reverseGeocode(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{`
        @keyframes locatePulse {
          0%, 100% { box-shadow: 0 6px 16px rgba(244,114,30,0.35); transform: translateY(0); }
          50% { box-shadow: 0 10px 24px rgba(220,38,38,0.45); transform: translateY(-1px); }
        }
      `}</style>

      {/* Mapa */}
      <div style={{
        height: 280, borderRadius: 14, overflow: "hidden",
        border: "1.5px solid var(--menu-border)",
        position: "relative",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          />
          <MapClickHandler onClick={handleMove} />
          <DraggableMarker pos={pos} onMove={handleMove} />
          <FlyToTarget target={flyTarget} />
        </MapContainer>

        {/* Botón "Mi ubicación" — flotante sobre el mapa */}
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 1000,
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 13px", borderRadius: 10,
            background: locating
              ? "#9CA3AF"
              : "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",
            border: "2px solid rgba(255,255,255,0.92)",
            boxShadow: locating
              ? "0 4px 12px rgba(0,0,0,0.2)"
              : "0 8px 22px rgba(220,38,38,0.35)",
            fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 800,
            color: "#fff", cursor: locating ? "not-allowed" : "pointer",
            opacity: locating ? 0.7 : 1,
            transition: "all 0.15s",
            animation: locating ? "none" : "locatePulse 1.8s ease-in-out infinite",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
          </svg>
          {locating ? "Buscando…" : "Usar mi ubicación"}
        </button>
      </div>

      {/* Hint */}
      <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", margin: 0, lineHeight: 1.4 }}>
        {bootstrapping
          ? "Centrando mapa cerca del restaurante…"
          : !hasInteracted
          ? "Toca el mapa o usa \"Mi ubicación\" para colocar el pin en tu domicilio."
          : geocoding
            ? "Obteniendo dirección…"
            : "Arrastra el pin o toca el mapa para ajustar la ubicación."}
      </p>

      {/* Dirección detectada */}
      {displayAddr && !geocoding && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 6,
          padding: "8px 10px", borderRadius: 8,
          background: "var(--menu-accent-soft, #fff7ed)",
          border: "1px solid rgba(244,114,30,0.2)",
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📍</span>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-primary)", margin: 0, lineHeight: 1.5 }}>
            {displayAddr}
          </p>
        </div>
      )}
    </div>
  );
}
