"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

// ── Helper: extrae la región recortada del canvas ──────────────────────────────

async function getCroppedCanvas(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas no disponible")); return; }
      ctx.drawImage(
        img,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("Error al generar la imagen")); return; }
        resolve(blob);
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = imageSrc;
  });
}

// ── Componente ─────────────────────────────────────────────────────────────────

interface CropModalProps {
  imageSrc:  string
  aspect:    number          // 1 para logo, 16/9 para portada
  title:     string
  hint:      string          // descripción de la proporción
  onConfirm: (blob: Blob) => void
  onCancel:  () => void
}

export function CropModal({ imageSrc, aspect, title, hint, onConfirm, onCancel }: CropModalProps) {
  const [crop,       setCrop]       = useState({ x: 0, y: 0 });
  const [zoom,       setZoom]       = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedCanvas(imageSrc, croppedArea);
      onConfirm(blob);
    } catch (e) {
      console.error("[CropModal]", e);
      alert("Error al procesar la imagen. Intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    /* Overlay */
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Panel */}
      <div style={{
        width: "100%", maxWidth: 520,
        background: "var(--dash-surface)",
        border: "1px solid var(--dash-border)",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--dash-border)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 15, color: "var(--dash-text)", margin: "0 0 2px" }}>
              {title}
            </p>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: 0 }}>
              {hint}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--dash-muted)", padding: 4, borderRadius: 6,
              lineHeight: 1, fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        {/* Área de recorte */}
        <div style={{ position: "relative", height: 320, background: "#111" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: "2px solid var(--dash-orange)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              },
            }}
          />
        </div>

        {/* Slider de zoom */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--dash-border)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", minWidth: 24 }}>1×</span>
          <input
            type="range"
            min={1} max={3} step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--dash-orange)", cursor: "pointer", height: 4 }}
          />
          <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)", minWidth: 24 }}>3×</span>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: 12, fontWeight: 700, color: "var(--dash-orange)", minWidth: 36, textAlign: "right" }}>
            {zoom.toFixed(1)}×
          </span>
        </div>

        {/* Botones */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--dash-border)",
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button
            onClick={onCancel}
            disabled={processing}
            style={{
              fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 500,
              padding: "9px 18px", borderRadius: 8,
              background: "none",
              border: "1px solid var(--dash-border)",
              color: "var(--dash-muted)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || !croppedArea}
            style={{
              fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600,
              padding: "9px 20px", borderRadius: 8,
              background: (processing || !croppedArea) ? "var(--dash-border)" : "var(--dash-orange)",
              color: (processing || !croppedArea) ? "var(--dash-muted)" : "#fff",
              border: "none",
              cursor: (processing || !croppedArea) ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {processing ? "Procesando…" : "Recortar y subir →"}
          </button>
        </div>
      </div>
    </div>
  );
}
