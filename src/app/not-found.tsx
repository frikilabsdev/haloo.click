import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0C0B09",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 520,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "56px 44px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        textAlign: "center",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          background: "radial-gradient(ellipse at 50% 0%, rgba(244,114,30,0.1) 0%, transparent 55%)",
          pointerEvents: "none",
        }} />

        {/* 404 grande */}
        <div style={{
          fontFamily: "var(--font-syne, 'Syne', sans-serif)",
          fontSize: "clamp(80px, 18vw, 120px)",
          fontWeight: 800,
          color: "transparent",
          backgroundImage: "linear-gradient(135deg, #F4721E 0%, #E05A10 50%, rgba(244,114,30,0.2) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          lineHeight: 1,
          letterSpacing: "-0.04em",
          margin: "0 0 24px",
          userSelect: "none",
        }}>
          404
        </div>

        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 16,
        }}>
          <span style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#F4721E",
            boxShadow: "0 0 12px #F4721E",
          }} />
          <span style={{
            fontFamily: "var(--font-syne, sans-serif)",
            color: "#F0EDE8",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}>
            Haloo
          </span>
        </div>

        <h1 style={{
          fontFamily: "var(--font-syne, sans-serif)",
          fontSize: 26,
          fontWeight: 700,
          color: "#F0EDE8",
          margin: "0 0 12px",
          letterSpacing: "-0.02em",
        }}>
          Página no encontrada
        </h1>
        <p style={{
          fontFamily: "var(--font-dm, sans-serif)",
          fontSize: 14,
          color: "#8A8070",
          lineHeight: 1.7,
          margin: "0 0 40px",
        }}>
          La página que buscas no existe o fue movida.
          Verifica la URL o regresa al inicio.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/" style={{
            padding: "14px 24px",
            background: "linear-gradient(135deg, #F4721E, #E05A10)",
            border: "none",
            borderRadius: 10,
            fontFamily: "var(--font-syne, sans-serif)",
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            textDecoration: "none",
            letterSpacing: "0.02em",
            boxShadow: "0 4px 24px rgba(244,114,30,0.35)",
            display: "block",
          }}>
            Ir al inicio →
          </Link>
          <Link href="/login" style={{
            padding: "14px 24px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            fontFamily: "var(--font-dm, sans-serif)",
            fontSize: 14,
            color: "#8A8070",
            textDecoration: "none",
            display: "block",
          }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
