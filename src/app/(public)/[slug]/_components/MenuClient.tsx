"use client";

import { useState, useEffect, useRef } from "react";
import type { TenantWithRelations, CategoryWithProducts, ProductWithOptions } from "@/types";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency, normalizeCustomizationLabel } from "@/lib/utils";
import { ProductModal } from "./ProductModal";
import { CartDrawer } from "./CartDrawer";

interface Props {
  tenant: TenantWithRelations;
  categories: CategoryWithProducts[];
}

export function MenuClient({ tenant, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOptions | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const cartCount = useCartStore(s => s.count());
  const setTenant = useCartStore(s => s.setTenant);
  const [mounted, setMounted]         = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement>>({});
  const sectionRefs = useRef<Record<string, HTMLElement>>({});

  useEffect(() => { setTenant(tenant.slug); }, [tenant.slug, setTenant]);
  useEffect(() => {
    setMounted(true);
    // Recuperar último pedido activo desde localStorage (máx 24h)
    try {
      const raw = localStorage.getItem(`haloo_last_order_${tenant.slug}`);
      if (raw) {
        const { orderId, ts } = JSON.parse(raw);
        if (orderId && Date.now() - ts < 86_400_000) setLastOrderId(orderId);
      }
    } catch { /* */ }
  }, [tenant.slug]);

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveCategory(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -65% 0px" }
    );
    Object.values(sectionRefs.current).forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Auto-scroll el chip activo al centro cuando cambia por scroll spy
  useEffect(() => {
    const chip = chipRefs.current[activeCategory];
    const container = chipScrollRef.current;
    if (!chip || !container) return;
    const chipLeft = chip.offsetLeft;
    const chipWidth = chip.offsetWidth;
    const containerWidth = container.offsetWidth;
    container.scrollTo({
      left: chipLeft - containerWidth / 2 + chipWidth / 2,
      behavior: "smooth",
    });
  }, [activeCategory]);

  function scrollTo(catId: string) {
    sectionRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveCategory(catId);
  }

  // null = sin horarios configurados (tratar como abierto), true/false = calculado
  const isOpen = checkIfOpen(tenant.schedules ?? []);
  const isClosed = isOpen === false;

  return (
    <div className="menu-no-horizontal" style={{ background: "var(--menu-bg)", minHeight: "100vh", fontFamily: "var(--font-nunito)" }}>

      {/* ── HERO ── */}
      <div style={{ background: "var(--menu-card)", paddingBottom: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Cover */}
          <div className="menu-cover">
            {tenant.coverImage ? (
              <img src={tenant.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ position: "absolute", inset: 0 }}>
                {/* Gradiente geométrico inspirado en la imagen */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 40%, #1C1C1E 100%)" }} />
                {/* Círculos decorativos */}
                <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(232,49,42,0.12)" }} />
                <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,149,0,0.08)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 56, opacity: 0.12 }}>🍽️</span>
                </div>
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.55) 100%)" }} />
          </div>

          {/* Info del restaurante */}
          <div style={{ padding: "0 20px 20px", position: "relative" }}>

            {/* Logo */}
            <div className="menu-logo">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "var(--menu-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 26, color: "#fff" }}>🍴</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div className="menu-info" style={{ flex: 1, minWidth: 0 }}>
                {/* Nombre */}
                <h1 style={{
                  fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 24,
                  color: "var(--menu-primary)", margin: "0 0 6px", lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                }}>
                  {tenant.name}
                </h1>

                {/* Meta */}
                <div className="menu-meta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {tenant.type && (
                    <span style={{
                      fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 700,
                      padding: "3px 10px", borderRadius: 100,
                      background: "var(--menu-bg)", color: "var(--menu-muted)",
                    }}>
                      {tenant.type}
                    </span>
                  )}
                  {tenant.city && (
                    <span style={{ fontFamily: "var(--font-nunito)", fontSize: 12, color: "var(--menu-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {tenant.city.name}
                    </span>
                  )}
                  {isOpen !== null && (
                    <span style={{
                      fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 800,
                      padding: "3px 10px", borderRadius: 100,
                      background: isOpen ? "#ECFDF5" : "#FEF0EF",
                      color: isOpen ? "#059669" : "var(--menu-accent)",
                    }}>
                      {isOpen ? "● Abierto" : "● Cerrado"}
                    </span>
                  )}
                </div>

                {tenant.description && (
                  <p style={{
                    fontFamily: "var(--font-nunito)", fontWeight: 500, fontSize: 12,
                    color: "var(--menu-muted)", margin: "8px 0 0", lineHeight: 1.55, maxWidth: 600,
                  }}>
                    {tenant.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NAV DE CATEGORÍAS TIPO PILL (sticky) ── */}
      <div ref={navRef} style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "#FFFFFF",
        borderBottom: "1px solid var(--menu-border)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            ref={chipScrollRef}
            style={{
              display: "flex",
              flexWrap: "wrap",
              padding: "0 16px",
              gap: 4,
              alignItems: "flex-end",
            }}
          >
            {categories.map(cat => (
              <button
                key={cat.id}
                ref={el => { if (el) chipRefs.current[cat.id] = el; }}
                onClick={() => scrollTo(cat.id)}
                className={`menu-cat-chip${activeCategory === cat.id ? " active" : ""}`}
              >
                {normalizeCustomizationLabel(cat.name)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BUSCADOR ── */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid var(--menu-border)", padding: "10px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="var(--menu-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar platillos…"
            style={{
              width: "100%", boxSizing: "border-box",
              paddingLeft: 36, paddingRight: searchQuery ? 36 : 14,
              paddingTop: 9, paddingBottom: 9,
              background: "var(--menu-bg)", border: "1px solid var(--menu-border)",
              borderRadius: 10, outline: "none",
              fontFamily: "var(--font-nunito)", fontSize: 14, fontWeight: 600,
              color: "var(--menu-primary)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--menu-muted)", padding: 4, display: "flex",
              }}
              aria-label="Limpiar búsqueda"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── BANNER CERRADO ── */}
      {isClosed && (
        <div style={{ background: "var(--menu-accent-soft)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "11px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🕐</span>
            <p style={{ fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 700, color: "var(--menu-accent)", margin: 0 }}>
              Restaurante cerrado
              {(() => { const next = nextOpenTime(tenant.schedules ?? []); return next ? ` · Abrimos ${next}` : ""; })()}
            </p>
          </div>
        </div>
      )}

      {/* ── GRID DE PRODUCTOS ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 120px" }}>
        {searchQuery.trim() ? (
          // ── Vista de búsqueda ──
          (() => {
            const q = searchQuery.trim().toLowerCase();
            const results = categories.flatMap(cat =>
              cat.products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description ?? "").toLowerCase().includes(q)
              )
            );
            return results.length > 0 ? (
              <>
                <p style={{
                  fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 700,
                  color: "var(--menu-muted)", margin: "20px 0 14px",
                }}>
                  {results.length} resultado{results.length !== 1 ? "s" : ""} para &ldquo;{searchQuery.trim()}&rdquo;
                </p>
                <div className="menu-product-grid">
                  {results.map(product => (
                    <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
                <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 16, color: "var(--menu-primary)", margin: "0 0 6px" }}>
                  Sin resultados
                </p>
                <p style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--menu-muted)", margin: 0 }}>
                  No encontramos nada para &ldquo;{searchQuery.trim()}&rdquo;
                </p>
              </div>
            );
          })()
        ) : (
          // ── Vista normal por categorías ──
          categories.map((cat, idx) => (
            <section key={cat.id} id={cat.id}
              ref={el => { if (el) sectionRefs.current[cat.id] = el; }}
              className="menu-section-appear"
              style={{ paddingTop: 28, animationDelay: `${idx * 0.04}s` }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: cat.description ? 4 : 16 }}>
                <h2 style={{
                  fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 19,
                  color: "var(--menu-primary)", margin: 0, letterSpacing: "-0.02em",
                }}>
                  {normalizeCustomizationLabel(cat.name)}
                </h2>
                <span style={{ fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 700, color: "var(--menu-muted)" }}>
                  {cat.products.length} {cat.products.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              {cat.description && (
                <p style={{ fontFamily: "var(--font-nunito)", fontWeight: 500, fontSize: 12, color: "var(--menu-muted)", margin: "0 0 16px" }}>
                  {cat.description}
                </p>
              )}
              <div className="menu-product-grid">
                {cat.products.map(product => (
                  <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ── BANNER PEDIDO ACTIVO ── */}
      {mounted && lastOrderId && cartCount === 0 && (
        <a
          href={`/${tenant.slug}/pedido/${lastOrderId}`}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "#25d366", color: "#fff",
            textDecoration: "none", borderRadius: 100, padding: "14px 24px",
            fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 14,
            cursor: "pointer", zIndex: 50,
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 8px 28px rgba(37,211,102,0.45)",
            animation: "cartFabPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Ver estado de tu pedido
        </a>
      )}

      {/* ── FAB CARRITO ── */}
      {mounted && cartCount > 0 && (
        <button onClick={() => setCartOpen(true)}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: isClosed ? "#8E8E93" : "var(--menu-accent)", color: "#fff",
            border: "none", borderRadius: 100, padding: "16px 28px",
            fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 15,
            cursor: "pointer", zIndex: 50,
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: isClosed ? "0 8px 24px rgba(0,0,0,0.25)" : "0 8px 32px rgba(232,49,42,0.45)",
            animation: "cartFabPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}>
          {/* Badge */}
          <span style={{
            background: "rgba(255,255,255,0.25)",
            borderRadius: "50%", minWidth: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900,
            animation: "badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}>
            {cartCount}
          </span>
          {isClosed ? "🕐 Restaurante cerrado" : "Ver mi pedido"}
          {/* Icono de carrito */}
          {!isClosed && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          )}
        </button>
      )}

      {/* ── MODALES ── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      {cartOpen && (
        <CartDrawer
          tenant={tenant}
          onClose={() => setCartOpen(false)}
          isOpen={isOpen}
        />
      )}
    </div>
  );
}

function ProductCard({ product, onClick }: { product: ProductWithOptions; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const thumb = product.images[0]?.url;
  const hasOptions = product.optionGroups.length > 0;
  const hasVariants = product.variants.length > 0;
  const isVariantGroups = !hasVariants ? product.optionGroups.filter(g => g.isVariant) : [];
  const hasIsVariantGroups = isVariantGroups.length > 0;
  const minIsVariantPrice = hasIsVariantGroups
    ? Math.min(...isVariantGroups.flatMap(g => g.options.map(o => Number(o.price))).filter(p => p > 0))
    : null;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        background: "var(--menu-card)",
        border: "1px solid var(--menu-border)",
        borderRadius: 16,
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "transform 0.18s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.18s",
        boxShadow: hovered ? "0 6px 24px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Texto */}
      <div style={{
        flex: 1, minWidth: 0, overflow: "hidden",
        padding: "14px 10px 14px 14px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Nombre + badge */}
        <div style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
            <h3 className="menu-product-name" style={{
              fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 14,
              color: product.isAvailable ? "var(--menu-primary)" : "var(--menu-muted)",
              margin: 0, lineHeight: 1.25,
            }}>
              {product.name}
            </h3>
            {!product.isAvailable && (
              <span style={{
                fontSize: 9, background: "var(--menu-accent-soft)", color: "var(--menu-accent)",
                padding: "2px 7px", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0,
                fontFamily: "var(--font-nunito)", fontWeight: 800,
              }}>
                Agotado
              </span>
            )}
          </div>
          {product.description && (
            <p className="menu-product-desc" style={{
              fontFamily: "var(--font-nunito)", fontWeight: 500, fontSize: 11,
              color: "var(--menu-muted)", margin: 0, lineHeight: 1.4,
            }}>
              {product.description}
            </p>
          )}
        </div>

        {/* Precio + personalizable */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{
            fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 15,
            color: "var(--menu-accent)", letterSpacing: "-0.02em",
          }}>
            {(hasVariants || hasIsVariantGroups) ? "Desde " : ""}
            {formatCurrency(minIsVariantPrice ?? Number(product.basePrice))}
          </span>
          {hasOptions && !hasVariants && (
            <span style={{
              fontFamily: "var(--font-nunito)", fontSize: 10, fontWeight: 700,
              color: "var(--menu-muted)", background: "var(--menu-bg)",
              padding: "2px 7px", borderRadius: 100,
            }}>
              + opciones
            </span>
          )}
        </div>
      </div>

      {/* Imagen con esquinas redondeadas */}
      <div className="menu-product-img" style={{
        position: "relative",
        margin: "8px 8px 8px 0",
        borderRadius: 12, overflow: "hidden",
        background: "#F5F6FA",
        flexShrink: 0,
      }}>
        {thumb ? (
          <img
            src={thumb}
            alt={product.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: hovered ? "scale(1.07)" : "scale(1)",
              transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
              display: "block",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #FFECD2, #FCB69F)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
          }}>
            🍽️
          </div>
        )}
        {/* Botón "+" superpuesto — inspirado en la imagen */}
        {product.isAvailable && (
          <div style={{
            position: "absolute", bottom: 6, right: 6,
            width: 24, height: 24, borderRadius: "50%",
            background: "var(--menu-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(232,49,42,0.4)",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "scale(1)" : "scale(0.7)",
            transition: "all 0.2s cubic-bezier(0.34,1.2,0.64,1)",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 2v8M2 6h8"/>
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

// Retorna: null = sin horarios configurados (abierto por defecto)
//           true  = abierto ahora
//           false = cerrado ahora
function checkIfOpen(schedules: { dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }[]): boolean | null {
  const active = schedules.filter(s => s.isActive);
  if (active.length === 0) return null; // sin configuración → siempre abierto
  const now = new Date();
  const day = now.getDay();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const sched = active.find(s => s.dayOfWeek === day);
  if (!sched) return false; // día sin horario configurado → cerrado
  return time >= sched.openTime && time <= sched.closeTime;
}

function nextOpenTime(schedules: { dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }[]): string | null {
  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const active = schedules.filter(s => s.isActive);
  if (active.length === 0) return null;
  const now = new Date();
  const today = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  for (let i = 0; i < 7; i++) {
    const day = (today + i) % 7;
    const sched = active.find(s => s.dayOfWeek === day);
    if (!sched) continue;
    // Si es hoy y la hora de apertura ya pasó, la sesión de hoy cerró → buscar siguiente día
    if (i === 0 && currentTime >= sched.openTime) continue;
    const label = i === 0 ? "Hoy" : i === 1 ? "Mañana" : DAYS[day];
    return `${label} ${sched.openTime}`;
  }
  return null;
}
