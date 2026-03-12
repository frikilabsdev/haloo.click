"use client";

import { signOut } from "next-auth/react";

export function PendienteCard({ name, adminWa }: { name?: string | null; adminWa: string }) {
  const waMsg  = name
    ? `Hola, soy el dueño de *${name}* y acabo de registrarme en Haloo. ¿Pueden activar mi cuenta? Gracias.`
    : "Hola, acabo de registrarme en Haloo y quisiera confirmar el proceso de activación.";
  const waLink = `https://wa.me/${adminWa}?text=${encodeURIComponent(waMsg)}`;
  return (
    <>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pendiente-page {
          min-height: 100dvh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 24px; position: relative; overflow: hidden;
          background: #0A0F1C;
          font-family: var(--font-dm, system-ui, sans-serif);
        }
        .pendiente-bg {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 65% 55% at 40% 35%, rgba(244,114,30,0.14) 0%, transparent 65%),
            radial-gradient(ellipse 45% 40% at 70% 70%, rgba(99,102,241,0.08) 0%, transparent 60%);
        }
        .pendiente-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%);
        }
        .pendiente-card {
          position: relative; z-index: 1;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(28px) saturate(1.6);
          -webkit-backdrop-filter: blur(28px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 28px;
          padding: 52px 44px;
          max-width: 460px; width: 100%;
          text-align: center;
          box-shadow: 0 28px 72px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07);
          animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both;
        }
        .pendiente-orbit {
          width: 72px; height: 72px; border-radius: 50%;
          border: 2px dashed rgba(244,114,30,0.4);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px;
          animation: spin-slow 8s linear infinite;
        }
        .pendiente-orbit-inner {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(244,114,30,0.12);
          border: 1px solid rgba(244,114,30,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          animation: spin-slow 8s linear infinite reverse;
        }
        .pendiente-title {
          font-family: var(--font-syne, system-ui, sans-serif);
          font-weight: 800; font-size: 22px;
          color: #F1F5F9; margin-bottom: 8px; line-height: 1.25;
        }
        .pendiente-name {
          color: #FB923C;
        }
        .pendiente-divider {
          width: 36px; height: 2px;
          background: rgba(244,114,30,0.5);
          border-radius: 2px; margin: 18px auto;
        }
        .pendiente-desc {
          font-size: 14px; line-height: 1.75; color: #94A3B8;
          margin-bottom: 0;
        }
        .pendiente-desc strong { color: #CBD5E1; }
        .pendiente-steps {
          display: flex; flex-direction: column; gap: 10px;
          margin: 24px 0 0; text-align: left;
        }
        .pendiente-step {
          display: flex; align-items: flex-start; gap: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 12px 14px;
        }
        .pendiente-step-num {
          width: 22px; height: 22px; border-radius: 6px;
          background: rgba(244,114,30,0.15);
          border: 1px solid rgba(244,114,30,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: #FB923C;
          flex-shrink: 0;
        }
        .pendiente-step-text {
          font-size: 13px; color: #94A3B8; line-height: 1.5; padding-top: 2px;
        }
        .btn-wa {
          display: inline-flex; align-items: center; gap: 10px;
          margin-top: 28px; width: 100%; justify-content: center;
          background: #25D366; color: #fff;
          font-family: inherit; font-size: 14px; font-weight: 700;
          padding: 14px 24px; border-radius: 12px; border: none;
          text-decoration: none; cursor: pointer;
          box-shadow: 0 4px 20px rgba(37,211,102,0.3);
          transition: opacity 0.2s, transform 0.15s;
        }
        .btn-wa:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-signout {
          display: block; margin-top: 14px; width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748B; font-family: inherit; font-size: 13px; font-weight: 500;
          padding: 11px 20px; border-radius: 10px; cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .btn-signout:hover { color: #94A3B8; border-color: rgba(255,255,255,0.14); }
        .pendiente-logo {
          position: absolute; top: 24px; left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-syne, system-ui, sans-serif);
          font-weight: 800; font-size: 20px; color: #F4721E;
          letter-spacing: -0.02em; z-index: 2;
          text-decoration: none;
        }
      `}</style>

      <div className="pendiente-page">
        <div className="pendiente-bg" />
        <div className="pendiente-grid" />

        <a href="/" className="pendiente-logo">haloo</a>

        <div className="pendiente-card">
          <div className="pendiente-orbit">
            <div className="pendiente-orbit-inner">⏳</div>
          </div>

          <h1 className="pendiente-title">
            {name ? (
              <>Tu restaurante<br /><span className="pendiente-name">{name}</span><br />está en revisión</>
            ) : (
              "Tu restaurante está en revisión"
            )}
          </h1>

          <div className="pendiente-divider" />

          <p className="pendiente-desc">
            Recibimos tu registro. El equipo de Haloo revisará tu información y activará tu cuenta en breve.
          </p>

          <div className="pendiente-steps">
            <div className="pendiente-step">
              <div className="pendiente-step-num">1</div>
              <div className="pendiente-step-text"><strong style={{ color: "#CBD5E1" }}>Registro recibido</strong> — tus datos están seguros.</div>
            </div>
            <div className="pendiente-step">
              <div className="pendiente-step-num">2</div>
              <div className="pendiente-step-text"><strong style={{ color: "#CBD5E1" }}>Revisión</strong> — validamos tu restaurante (menos de 24h).</div>
            </div>
            <div className="pendiente-step">
              <div className="pendiente-step-num">3</div>
              <div className="pendiente-step-text"><strong style={{ color: "#CBD5E1" }}>Activación</strong> — acceso completo a tu panel y menú público.</div>
            </div>
          </div>

          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-wa">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.533 5.851L.057 23.999l6.305-1.654A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.378l-.36-.213-3.733.979 1.001-3.642-.234-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
            </svg>
            Notificar al administrador
          </a>

          <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-signout">
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
