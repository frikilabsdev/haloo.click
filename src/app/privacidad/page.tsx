import Link from "next/link";

export const metadata = {
  title: "Aviso de Privacidad — Haloo",
  description: "Aviso de privacidad de Haloo conforme a la LFPDPPP.",
};

const EFFECTIVE_DATE = "11 de marzo de 2026";
const ADMIN_EMAIL    = "admin@haloo.click";
const ADMIN_WHATSAPP = "529711260809";
const APP_URL        = "https://haloo.click";

export default function PrivacidadPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0C0B09",
      color: "#F0EDE8",
      fontFamily: "var(--font-dm, sans-serif)",
    }}>

      {/* Barra de navegación mínima */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(12,11,9,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#F4721E",
            boxShadow: "0 0 10px #F4721E",
          }} />
          <span style={{
            fontFamily: "var(--font-syne, sans-serif)",
            fontWeight: 800,
            fontSize: 18,
            color: "#F0EDE8",
            letterSpacing: "-0.02em",
          }}>
            Haloo
          </span>
        </Link>
        <Link href="/" style={{
          fontFamily: "var(--font-dm, sans-serif)",
          fontSize: 13,
          color: "#8A8070",
          textDecoration: "none",
        }}>
          ← Inicio
        </Link>
      </nav>

      {/* Contenido */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>

        <h1 style={{
          fontFamily: "var(--font-syne, sans-serif)",
          fontSize: "clamp(28px, 5vw, 40px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#F0EDE8",
          margin: "0 0 8px",
        }}>
          Aviso de Privacidad
        </h1>
        <p style={{ fontSize: 13, color: "#5A5040", margin: "0 0 48px" }}>
          Fecha de entrada en vigor: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Responsable del tratamiento">
          <p>
            <strong>Haloo</strong> (en adelante, "Haloo", "nosotros" o "la Plataforma"), con domicilio
            en México, es responsable del tratamiento de sus datos personales conforme a lo previsto en
            la <em>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</em> (LFPDPPP)
            y su Reglamento.
          </p>
          <p>
            Contacto del responsable:{" "}
            <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "#F4721E", textDecoration: "none" }}>
              {ADMIN_EMAIL}
            </a>
          </p>
        </Section>

        <Section title="2. Datos personales recabados">
          <p>Haloo recaba las siguientes categorías de datos personales:</p>
          <ul>
            <li><strong>Datos de propietarios de restaurantes:</strong> nombre, correo electrónico, número de teléfono/WhatsApp, ciudad, nombre del negocio.</li>
            <li><strong>Datos de clientes que realizan pedidos:</strong> nombre, número de teléfono, número de WhatsApp, dirección de entrega y coordenadas geográficas (solo cuando el cliente activa la localización).</li>
          </ul>
          <p>
            No recabamos datos financieros. Los pagos con transferencia se coordinan directamente entre
            el cliente y el restaurante sin intermediación de Haloo.
          </p>
        </Section>

        <Section title="3. Finalidades del tratamiento">
          <p><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
          <ul>
            <li>Crear y administrar la cuenta del restaurante en la Plataforma.</li>
            <li>Procesar y entregar pedidos realizados a través del menú en línea.</li>
            <li>Enviar notificaciones relacionadas con el servicio (confirmación de pedido, recuperación de contraseña).</li>
            <li>Brindar soporte técnico.</li>
          </ul>
          <p><strong>Finalidades secundarias (no necesarias para el servicio):</strong></p>
          <ul>
            <li>Envío de novedades, actualizaciones o promociones de Haloo.</li>
          </ul>
          <p>
            Si no desea que sus datos sean utilizados para finalidades secundarias, puede manifestarlo
            enviando un correo a <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "#F4721E", textDecoration: "none" }}>{ADMIN_EMAIL}</a> con el
            asunto <em>"Oposición a finalidades secundarias"</em>.
          </p>
        </Section>

        <Section title="4. Transferencia de datos">
          <p>
            Sus datos no serán transferidos a terceros sin su consentimiento, salvo en los casos
            previstos por la LFPDPPP (autoridades competentes, obligación legal). Los datos de pedidos
            son compartidos únicamente con el restaurante al que realizó la compra.
          </p>
          <p>
            Haloo utiliza los siguientes proveedores de servicios que actúan como encargados del tratamiento:
          </p>
          <ul>
            <li><strong>Cloudinary</strong> — almacenamiento de imágenes de productos (datos no personales).</li>
            <li><strong>Resend</strong> — envío de correos transaccionales (solo dirección de correo).</li>
          </ul>
        </Section>

        <Section title="5. Cookies y tecnologías de seguimiento">
          <p>
            Haloo utiliza cookies de sesión estrictamente necesarias para el funcionamiento del panel
            de administración. No utilizamos cookies de publicidad ni rastreo de terceros.
          </p>
          <p>
            Los menús públicos de restaurantes no requieren cookies.
          </p>
        </Section>

        <Section title="6. Derechos ARCO">
          <p>
            Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse (ARCO)</strong> al
            tratamiento de sus datos personales. Para ejercer estos derechos, envíe su solicitud a:
          </p>
          <ul>
            <li>
              Correo:{" "}
              <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "#F4721E", textDecoration: "none" }}>
                {ADMIN_EMAIL}
              </a>
            </li>
            <li>
              WhatsApp:{" "}
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#25D366", textDecoration: "none" }}
              >
                +{ADMIN_WHATSAPP.replace("52", "52 ")}
              </a>
            </li>
          </ul>
          <p>
            Haloo responderá a su solicitud dentro de los plazos establecidos por la LFPDPPP
            (máximo 20 días hábiles).
          </p>
        </Section>

        <Section title="7. Conservación de datos">
          <p>
            Los datos de propietarios de restaurantes se conservan mientras la cuenta esté activa y
            durante el período necesario para cumplir obligaciones legales o contractuales.
          </p>
          <p>
            Los datos de clientes asociados a pedidos se conservan por un máximo de 12 meses para
            efectos de soporte, después de lo cual se eliminan o anonimizan.
          </p>
        </Section>

        <Section title="8. Cambios al aviso de privacidad">
          <p>
            Haloo se reserva el derecho de modificar este aviso de privacidad en cualquier momento.
            Las modificaciones estarán disponibles en{" "}
            <a href={`${APP_URL}/privacidad`} style={{ color: "#F4721E", textDecoration: "none" }}>
              {APP_URL}/privacidad
            </a>
            . Le notificaremos cambios materiales por correo electrónico si tenemos su dirección registrada.
          </p>
        </Section>

        <Section title="9. Autoridad competente">
          <p>
            Si considera que su derecho a la protección de datos ha sido vulnerado, puede acudir ante
            el <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de
            Datos Personales (INAI)</strong> en{" "}
            <a
              href="https://home.inai.org.mx"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#F4721E", textDecoration: "none" }}
            >
              home.inai.org.mx
            </a>
            .
          </p>
        </Section>

        {/* Footer de la página */}
        <div style={{
          marginTop: 56,
          paddingTop: 32,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <p style={{ fontSize: 12, color: "#5A5040", margin: 0 }}>
            © 2026 Haloo · {APP_URL}
          </p>
          <Link href="/" style={{
            fontSize: 13,
            color: "#8A8070",
            textDecoration: "none",
          }}>
            Volver al inicio →
          </Link>
        </div>
      </main>
    </div>
  );
}

// ── Componente auxiliar para secciones ────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: "var(--font-syne, sans-serif)",
        fontSize: 18,
        fontWeight: 700,
        color: "#F0EDE8",
        margin: "0 0 16px",
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 14,
        lineHeight: 1.8,
        color: "#A09080",
      }}>
        {children}
      </div>
    </section>
  );
}
