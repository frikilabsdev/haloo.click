import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --orange: #F4721E;
          --orange-dim: rgba(244,114,30,0.12);
          --orange-glow: rgba(244,114,30,0.25);
          --bg: #0A0F1C;
          --surface: #111827;
          --surface2: #1A2233;
          --border: rgba(255,255,255,0.07);
          --text: #F1F5F9;
          --muted: #64748B;
          --muted2: #94A3B8;
        }

        body { background: var(--bg); }

        /* ── Animations ───────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to   { background-position:  200% 0; }
        }

        .anim-1 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .anim-2 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.22s both; }
        .anim-3 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.34s both; }
        .anim-4 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.46s both; }

        /* ── Nav ──────────────────────────────────── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 5vw; height: 60px;
          background: rgba(10,15,28,0.85);
          backdrop-filter: blur(16px) saturate(1.8);
          border-bottom: 1px solid var(--border);
          animation: fadeIn 0.5s ease both;
        }
        .nav-logo {
          font-family: var(--font-syne); font-weight: 800; font-size: 22px;
          color: var(--orange); letter-spacing: -0.02em; text-decoration: none;
        }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .btn-ghost {
          font-family: var(--font-dm); font-size: 13px; font-weight: 500;
          color: var(--muted2); background: none; border: none;
          padding: 8px 14px; border-radius: 8px; cursor: pointer;
          text-decoration: none; transition: color 0.2s;
        }
        .btn-ghost:hover { color: var(--text); }
        .btn-primary {
          font-family: var(--font-dm); font-size: 13px; font-weight: 700;
          color: #fff; background: var(--orange);
          border: none; padding: 9px 18px; border-radius: 9px;
          cursor: pointer; text-decoration: none;
          transition: opacity 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }

        /* ── Hero ─────────────────────────────────── */
        .hero-wrap {
          min-height: 100dvh; display: flex; align-items: center;
          justify-content: center; padding: 100px 5vw 80px;
          position: relative; overflow: hidden;
        }
        .hero-bg-glow {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 70% 55% at 50% 60%, rgba(244,114,30,0.13) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 15% 80%, rgba(244,114,30,0.08) 0%, transparent 60%);
        }
        .hero-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(var(--border) 1px, transparent 1px),
                            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
          opacity: 0.5;
        }
        .hero-inner {
          position: relative; max-width: 820px; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 28px;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid rgba(244,114,30,0.35);
          background: rgba(244,114,30,0.08);
          font-family: var(--font-dm); font-size: 12px; font-weight: 600;
          color: var(--orange); letter-spacing: 0.04em; text-transform: uppercase;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orange);
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .hero-title {
          font-family: var(--font-syne); font-weight: 800;
          font-size: clamp(36px, 7vw, 76px); line-height: 1.04;
          letter-spacing: -0.03em; color: var(--text);
        }
        .hero-title em {
          font-style: normal; color: var(--orange);
        }
        .hero-sub {
          font-family: var(--font-dm); font-size: clamp(15px, 2.2vw, 19px);
          line-height: 1.65; color: var(--muted2);
          max-width: 560px;
        }
        .hero-ctas {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center;
        }
        .btn-hero-primary {
          font-family: var(--font-dm); font-size: 15px; font-weight: 700;
          color: #fff; background: var(--orange);
          border: none; padding: 14px 28px; border-radius: 12px;
          cursor: pointer; text-decoration: none;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(244,114,30,0.35);
        }
        .btn-hero-primary:hover {
          opacity: 0.9; transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(244,114,30,0.45);
        }
        .btn-hero-secondary {
          font-family: var(--font-dm); font-size: 15px; font-weight: 600;
          color: var(--muted2);
          background: var(--surface2);
          border: 1px solid var(--border);
          padding: 14px 28px; border-radius: 12px;
          cursor: pointer; text-decoration: none;
          transition: color 0.2s, border-color 0.2s, transform 0.15s;
        }
        .btn-hero-secondary:hover {
          color: var(--text); border-color: rgba(255,255,255,0.18);
          transform: translateY(-2px);
        }
        .hero-stats {
          display: flex; gap: 32px; flex-wrap: wrap; justify-content: center;
          padding-top: 8px;
        }
        .hero-stat {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .hero-stat-num {
          font-family: var(--font-syne); font-size: 22px; font-weight: 800;
          color: var(--text);
        }
        .hero-stat-label {
          font-family: var(--font-dm); font-size: 11px;
          color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase;
        }
        .hero-divider {
          width: 1px; height: 32px; background: var(--border);
          align-self: center;
        }

        /* ── Phone mock ────────────────────────────── */
        .phone-mock-wrap {
          padding: 0 5vw 80px;
          display: flex; justify-content: center;
        }
        .phone-mock {
          width: 280px; height: 480px;
          background: var(--surface);
          border-radius: 32px;
          border: 1px solid var(--border);
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
          overflow: hidden;
          position: relative;
          animation: float 5s ease-in-out infinite;
        }
        .phone-notch {
          width: 80px; height: 20px;
          background: #0A0F1C;
          border-radius: 0 0 16px 16px;
          margin: 0 auto;
        }
        .phone-header {
          background: var(--orange);
          padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .phone-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .phone-header-text { flex: 1; }
        .phone-title { font-family: var(--font-syne); font-size: 13px; font-weight: 700; color: #fff; }
        .phone-subtitle { font-family: var(--font-dm); font-size: 10px; color: rgba(255,255,255,0.75); margin-top: 1px; }
        .phone-body { padding: 14px 12px; display: flex; flex-direction: column; gap: 10px; }
        .phone-msg {
          max-width: 75%; padding: 8px 12px; border-radius: 12px;
          font-family: var(--font-dm); font-size: 11px; line-height: 1.5;
        }
        .phone-msg-in {
          background: var(--surface2); color: var(--muted2);
          border-bottom-left-radius: 3px; align-self: flex-start;
        }
        .phone-msg-out {
          background: var(--orange); color: #fff;
          border-bottom-right-radius: 3px; align-self: flex-end;
        }
        .phone-msg-time {
          font-size: 9px; opacity: 0.6; margin-top: 3px; display: block;
        }
        .phone-order-card {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px; padding: 10px 12px;
          margin: 0 12px;
        }
        .phone-order-title {
          font-family: var(--font-syne); font-size: 11px; font-weight: 700;
          color: var(--orange); margin-bottom: 6px;
        }
        .phone-order-item {
          display: flex; justify-content: space-between; align-items: center;
          font-family: var(--font-dm); font-size: 10px; color: var(--muted2);
          padding: 3px 0; border-bottom: 1px solid var(--border);
        }
        .phone-order-item:last-child { border: none; }
        .phone-order-total {
          display: flex; justify-content: space-between;
          font-family: var(--font-dm); font-size: 11px; font-weight: 700;
          color: var(--text); margin-top: 6px;
        }

        /* ── Sections shared ───────────────────────── */
        .section {
          padding: 100px 5vw;
          position: relative;
        }
        .section-label {
          font-family: var(--font-dm); font-size: 11px; font-weight: 700;
          color: var(--orange); letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .section-title {
          font-family: var(--font-syne); font-weight: 800;
          font-size: clamp(28px, 4.5vw, 48px); line-height: 1.1;
          letter-spacing: -0.025em; color: var(--text);
          margin-bottom: 16px;
        }
        .section-desc {
          font-family: var(--font-dm); font-size: 16px; line-height: 1.7;
          color: var(--muted2); max-width: 520px;
        }

        /* ── Features ──────────────────────────────── */
        .features-wrap {
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 20px; overflow: hidden;
          margin-top: 60px;
        }
        .feature-card {
          background: var(--surface);
          padding: 32px 28px;
          display: flex; flex-direction: column; gap: 14px;
          transition: background 0.25s;
        }
        .feature-card:hover { background: var(--surface2); }
        .feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--orange-dim);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          border: 1px solid rgba(244,114,30,0.2);
        }
        .feature-title {
          font-family: var(--font-syne); font-size: 16px; font-weight: 700;
          color: var(--text); line-height: 1.3;
        }
        .feature-desc {
          font-family: var(--font-dm); font-size: 13.5px; line-height: 1.65;
          color: var(--muted2);
        }

        /* ── Steps ─────────────────────────────────── */
        .steps-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px; align-items: center;
          margin-top: 60px;
        }
        .steps-list { display: flex; flex-direction: column; gap: 0; }
        .step-item {
          display: flex; gap: 20px; padding: 24px 0;
          border-bottom: 1px solid var(--border);
          position: relative;
        }
        .step-item:last-child { border-bottom: none; }
        .step-num {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--orange-dim);
          border: 1px solid rgba(244,114,30,0.3);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-syne); font-size: 13px; font-weight: 800;
          color: var(--orange); flex-shrink: 0;
        }
        .step-body { flex: 1; }
        .step-title {
          font-family: var(--font-syne); font-size: 16px; font-weight: 700;
          color: var(--text); margin-bottom: 6px;
        }
        .step-desc {
          font-family: var(--font-dm); font-size: 13.5px; line-height: 1.6;
          color: var(--muted2);
        }
        .steps-visual {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 36px 28px;
          display: flex; flex-direction: column; gap: 16px;
          position: relative; overflow: hidden;
        }
        .steps-visual::before {
          content: "";
          position: absolute; top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(244,114,30,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .menu-preview-row {
          display: flex; gap: 12px; align-items: center;
          padding: 10px 14px; background: var(--surface2);
          border-radius: 12px; border: 1px solid var(--border);
        }
        .menu-preview-img {
          width: 40px; height: 40px; border-radius: 8px;
          background: linear-gradient(135deg, var(--orange-dim), var(--surface));
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .menu-preview-name {
          font-family: var(--font-dm); font-size: 13px; font-weight: 600; color: var(--text);
        }
        .menu-preview-price {
          font-family: var(--font-dm); font-size: 12px; color: var(--muted2); margin-top: 2px;
        }
        .menu-preview-add {
          margin-left: auto;
          background: var(--orange); color: #fff;
          border: none; width: 28px; height: 28px; border-radius: 8px;
          font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: var(--font-dm); font-weight: 700;
        }

        /* ── CTA banner ─────────────────────────────── */
        .cta-banner {
          margin: 0 5vw 80px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px; padding: 64px 5vw;
          text-align: center; position: relative; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; gap: 28px;
        }
        .cta-banner::before {
          content: "";
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 70% at 50% 50%, rgba(244,114,30,0.1) 0%, transparent 70%);
        }
        .cta-banner-title {
          font-family: var(--font-syne); font-weight: 800;
          font-size: clamp(26px, 4vw, 44px); line-height: 1.1;
          letter-spacing: -0.025em; color: var(--text);
          position: relative;
        }
        .cta-banner-sub {
          font-family: var(--font-dm); font-size: 16px; color: var(--muted2);
          max-width: 440px; line-height: 1.65; position: relative;
        }
        .cta-banner-actions {
          display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
          position: relative;
        }

        /* ── Footer ─────────────────────────────────── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 32px 5vw;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .footer-logo {
          font-family: var(--font-syne); font-weight: 800; font-size: 18px;
          color: var(--orange); text-decoration: none;
        }
        .footer-links {
          display: flex; gap: 24px;
        }
        .footer-link {
          font-family: var(--font-dm); font-size: 13px;
          color: var(--muted); text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover { color: var(--muted2); }
        .footer-copy {
          font-family: var(--font-dm); font-size: 12px; color: var(--muted);
        }

        /* ── Responsive ────────────────────────────── */
        @media (max-width: 768px) {
          .steps-layout {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .steps-visual { display: none; }
          .hero-stats .hero-divider { display: none; }
          .footer { flex-direction: column; align-items: flex-start; }
          .phone-mock-wrap { display: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="nav">
        <Link href="/" className="nav-logo">haloo</Link>
        <div className="nav-actions">
          <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/register" className="btn-primary">Registrar restaurante</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="hero-wrap">
        <div className="hero-bg-glow" />
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="hero-badge anim-1">
            <span className="hero-badge-dot" />
            Menú digital para restaurantes mexicanos
          </div>
          <h1 className="hero-title anim-2">
            Tu menú digital,<br />
            tus pedidos por <em>WhatsApp</em>
          </h1>
          <p className="hero-sub anim-3">
            Crea tu menú en minutos, compártelo con un link y recibe pedidos directo en WhatsApp. Sin comisiones por pedido, sin apps, sin complicaciones.
          </p>
          <div className="hero-ctas anim-4">
            <Link href="/register" className="btn-hero-primary">
              Comenzar ahora →
            </Link>
            <Link href="/login" className="btn-hero-secondary">
              Ya tengo cuenta
            </Link>
          </div>
          <div className="hero-stats anim-4">
            <div className="hero-stat">
              <span className="hero-stat-num">5 min</span>
              <span className="hero-stat-label">Para crear tu menú</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">$200</span>
              <span className="hero-stat-label">Pesos al mes</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">WhatsApp</span>
              <span className="hero-stat-label">Sin apps adicionales</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phone mock (decorative) ──────────────────────── */}
      <div className="phone-mock-wrap">
        <div className="phone-mock">
          <div className="phone-notch" />
          <div className="phone-header">
            <div className="phone-avatar">🍕</div>
            <div className="phone-header-text">
              <div className="phone-title">Restaurante El Molcajete</div>
              <div className="phone-subtitle">haloo.click/elmolcajete</div>
            </div>
          </div>
          <div className="phone-body">
            <div className="phone-msg phone-msg-in">
              Hola, quiero hacer un pedido 👋
              <span className="phone-msg-time">12:34</span>
            </div>
            <div className="phone-order-card">
              <div className="phone-order-title">🧾 Nuevo pedido</div>
              <div className="phone-order-item">
                <span>2× Tacos de pastor</span>
                <span>$120</span>
              </div>
              <div className="phone-order-item">
                <span>1× Agua de Jamaica</span>
                <span>$35</span>
              </div>
              <div className="phone-order-item">
                <span>Extras: Guac</span>
                <span>$25</span>
              </div>
              <div className="phone-order-total">
                <span>Total</span>
                <span>$180 MXN</span>
              </div>
            </div>
            <div className="phone-msg phone-msg-out">
              ¡Pedido recibido! En 20 min. 🔥
              <span className="phone-msg-time">12:35</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────── */}
      <section className="section features-wrap">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p className="section-label">Por qué Haloo</p>
          <h2 className="section-title">Todo lo que necesita<br />tu restaurante</h2>
          <p className="section-desc">
            Una plataforma diseñada específicamente para restaurantes en México. Simple, rápida y a un precio fijo mensual sin sorpresas.
          </p>
          <div className="features-grid">
            {[
              {
                icon: "📱",
                title: "Menú digital profesional",
                desc: "Crea categorías, productos con fotos, precios y descripciones. Tu menú siempre actualizado y accesible desde cualquier teléfono.",
              },
              {
                icon: "💬",
                title: "Pedidos directo a WhatsApp",
                desc: "El cliente elige sus platillos y el pedido llega a tu WhatsApp con todos los detalles. Sin intermediarios, sin apps extra.",
              },
              {
                icon: "⚙️",
                title: "Panel de gestión fácil",
                desc: "Agrega, edita o desactiva platillos en segundos desde tu celular o computadora. Control total de tu negocio.",
              },
              {
                icon: "🕐",
                title: "Horarios y disponibilidad",
                desc: "Configura tus horarios de atención. El menú muestra automáticamente si tu restaurante está abierto o cerrado.",
              },
            ].map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="section" style={{ background: "var(--bg)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p className="section-label">Cómo funciona</p>
          <h2 className="section-title">Tres pasos para<br />empezar a vender</h2>

          <div className="steps-layout">
            <div className="steps-list">
              {[
                {
                  n: "01",
                  title: "Regístrate",
                  desc: "Crea tu cuenta en menos de 2 minutos. Solo necesitas el nombre de tu restaurante y un correo. El equipo de Haloo activa tu cuenta.",
                },
                {
                  n: "02",
                  title: "Crea tu menú",
                  desc: "Agrega tus categorías y platillos con precios, fotos y extras. Personaliza a tu gusto. Listo para compartir.",
                },
                {
                  n: "03",
                  title: "Recibe pedidos",
                  desc: "Comparte tu link con tus clientes y recibe pedidos completos directo en tu WhatsApp. Así de simple.",
                },
              ].map((s) => (
                <div className="step-item" key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-body">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual preview */}
            <div className="steps-visual">
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 700, color: "var(--orange)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                Tu menú público
              </p>
              {[
                { emoji: "🌮", name: "Tacos de pastor", price: "desde $60" },
                { emoji: "🍲", name: "Pozole rojo", price: "desde $120" },
                { emoji: "🥑", name: "Guacamole + totopos", price: "$85" },
                { emoji: "🧃", name: "Aguas frescas", price: "desde $30" },
              ].map((item) => (
                <div className="menu-preview-row" key={item.name}>
                  <div className="menu-preview-img">{item.emoji}</div>
                  <div>
                    <div className="menu-preview-name">{item.name}</div>
                    <div className="menu-preview-price">{item.price}</div>
                  </div>
                  <button className="menu-preview-add" aria-label="Agregar">+</button>
                </div>
              ))}
              <div style={{
                background: "var(--orange)", borderRadius: 10, padding: "11px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 4,
              }}>
                <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  Ver carrito (3)
                </span>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: 14, fontWeight: 800, color: "#fff" }}>
                  $265 MXN →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <div className="cta-banner">
        <h2 className="cta-banner-title">
          Empieza hoy.<br />Solo $200 al mes.
        </h2>
        <p className="cta-banner-sub">
          Sin comisiones por pedido, sin contratos. Crea tu menú digital y comienza a recibir pedidos por WhatsApp desde hoy mismo.
        </p>
        <div className="cta-banner-actions">
          <Link href="/register" className="btn-hero-primary">
            Registrar mi restaurante →
          </Link>
          <Link href="/login" className="btn-hero-secondary">
            Iniciar sesión
          </Link>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="footer">
        <Link href="/" className="footer-logo">haloo</Link>
        <div className="footer-links">
          <Link href="/login" className="footer-link">Iniciar sesión</Link>
          <Link href="/register" className="footer-link">Registrarse</Link>
          <Link href="/privacidad" className="footer-link">Aviso de privacidad</Link>
        </div>
        <p className="footer-copy">
          © 2026 haloo.click · Creado con ♥ por{" "}
          <a
            href="https://frikilabs.click"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--orange)", textDecoration: "none" }}
          >
            Frikilabs
          </a>
        </p>
      </footer>
    </>
  );
}
