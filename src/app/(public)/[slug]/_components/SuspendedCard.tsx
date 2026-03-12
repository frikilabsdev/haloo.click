"use client";

const WA_ADMIN = "9711260809";

export function SuspendedCard({
  name,
  isOwner,
}: {
  name: string;
  isOwner: boolean;
}) {
  const waLink = `https://wa.me/52${WA_ADMIN}?text=${encodeURIComponent(
    `Hola, soy el dueño de *${name}* en Haloo. Quisiera información sobre la suspensión de mi cuenta.`
  )}`;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .suspended-page {
          min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          position: relative; overflow: hidden;
          background: #0A0F1C;
        }
        .suspended-bg-blur {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 30% 40%, rgba(220,38,38,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 50% 45% at 75% 65%, rgba(244,114,30,0.10) 0%, transparent 60%);
        }
        .suspended-card {
          position: relative; z-index: 1;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(24px) saturate(1.5);
          -webkit-backdrop-filter: blur(24px) saturate(1.5);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 24px;
          padding: 48px 40px;
          max-width: 440px; width: 100%;
          text-align: center;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
          animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        .suspended-icon {
          width: 64px; height: 64px; border-radius: 18px;
          background: rgba(220,38,38,0.15);
          border: 1px solid rgba(220,38,38,0.3);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          font-size: 28px;
        }
        .suspended-title {
          font-family: var(--font-syne); font-weight: 800; font-size: 22px;
          color: #F1F5F9; margin-bottom: 10px; line-height: 1.2;
        }
        .suspended-name {
          font-family: var(--font-syne); font-weight: 800; font-size: 22px;
          color: #F87171;
        }
        .suspended-desc {
          font-family: var(--font-dm); font-size: 14px; line-height: 1.7;
          color: #94A3B8; margin-bottom: 0;
        }
        .suspended-divider {
          width: 40px; height: 2px;
          background: rgba(220,38,38,0.4);
          border-radius: 2px; margin: 20px auto;
        }
        .btn-wa {
          display: inline-flex; align-items: center; gap: 10px;
          margin-top: 28px;
          background: #25D366; color: #fff;
          font-family: var(--font-dm); font-size: 14px; font-weight: 700;
          padding: 13px 24px; border-radius: 12px; border: none;
          text-decoration: none; cursor: pointer;
          box-shadow: 0 4px 20px rgba(37,211,102,0.3);
          transition: opacity 0.2s, transform 0.15s;
        }
        .btn-wa:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-back {
          display: block; margin-top: 14px;
          font-family: var(--font-dm); font-size: 13px;
          color: #64748B; text-decoration: none;
          transition: color 0.2s;
        }
        .btn-back:hover { color: #94A3B8; }
      `}</style>

      <div className="suspended-page">
        <div className="suspended-bg-blur" />
        <div className="suspended-card">
          <div className="suspended-icon">🔒</div>

          <h1 className="suspended-title">
            {isOwner ? "Tu cuenta está suspendida" : "Restaurante no disponible"}
          </h1>

          <div className="suspended-divider" />

          {isOwner ? (
            <>
              <p className="suspended-desc">
                Tu restaurante <strong style={{ color: "#F1F5F9" }}>{name}</strong> ha sido suspendido temporalmente.
                Contacta al equipo de soporte para más información.
              </p>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-wa">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.533 5.851L.057 23.999l6.305-1.654A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.378l-.36-.213-3.733.979 1.001-3.642-.234-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
                Contactar al admin
              </a>
            </>
          ) : (
            <p className="suspended-desc">
              <span className="suspended-name">{name}</span> no está disponible en este momento. Por favor, intenta más tarde.
            </p>
          )}

          <a href="/" className="btn-back">← Volver al inicio</a>
        </div>
      </div>
    </>
  );
}
