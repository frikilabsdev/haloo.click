"use client";

import { useState, useEffect } from "react";
import type { ProductWithOptions, OptionGroupWithOptions, SelectedOption, SuggestedProduct } from "@/types";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency, normalizeCustomizationLabel } from "@/lib/utils";

interface Props {
  product: ProductWithOptions;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  // IDs de productos sugeridos seleccionados para agregar junto al principal
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const addItem = useCartStore(s => s.addItem);

  const hasVariants = product.variants.length > 0;
  const activeSuggestions = (product.suggestions ?? []).filter(s => s.isActive);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  function visibleGroups(): OptionGroupWithOptions[] {
    return product.optionGroups.filter(group => {
      if (!group.showIfOptionId) return true;
      return Object.values(selections).flat().includes(group.showIfOptionId);
    });
  }

  function toggleOption(groupId: string, optionId: string, multiple: boolean, max: number | null) {
    setSelections(prev => {
      const current = prev[groupId] ?? [];
      if (multiple) {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(o => o !== optionId) };
        }
        if (max !== null && current.length >= max) return prev; // ya al límite
        return { ...prev, [groupId]: [...current, optionId] };
      }
      return { ...prev, [groupId]: current[0] === optionId ? [] : [optionId] };
    });
  }

  function toggleSuggestion(id: string) {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function calcMainTotal(): number {
    const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
    // isVariant group: selected option REPLACES basePrice
    const isVariantOption = visibleGroups()
      .filter(g => g.isVariant)
      .flatMap(g => g.options.filter(o => (selections[g.id] ?? []).includes(o.id)))[0];
    const unitBase = isVariantOption
      ? Number(isVariantOption.price)
      : selectedVariant
      ? Number(selectedVariant.price)
      : Number(product.basePrice);
    const extras = visibleGroups()
      .filter(g => !g.isVariant)
      .flatMap(g => g.options.filter(o => (selections[g.id] ?? []).includes(o.id)).map(o => Number(o.price)))
      .reduce((s, v) => s + v, 0);
    return (unitBase + extras) * quantity;
  }

  function calcSuggestionsTotal(): number {
    return activeSuggestions
      .filter(s => selectedSuggestions.has(s.id))
      .reduce((sum, s) => {
        const price = s.variants[0] ? Number(s.variants[0].price) : Number(s.basePrice);
        return sum + price;
      }, 0);
  }

  function calcTotal(): number {
    return calcMainTotal() + calcSuggestionsTotal();
  }

  function buildSelectedOptions(): SelectedOption[] {
    const result: SelectedOption[] = [];
    const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
    if (selectedVariant) {
      result.push({
        optionGroupId:   "variant",
        optionGroupName: product.variantGroupName ?? "Variante",
        optionId:        selectedVariant.id,
        optionName:      selectedVariant.name,
        price:           Number(selectedVariant.price),
      });
    }
    result.push(
      ...visibleGroups().flatMap(g =>
        g.options
          .filter(o => (selections[g.id] ?? []).includes(o.id))
          .map(o => ({
            optionGroupId:   g.id,
            optionGroupName: normalizeCustomizationLabel(g.name),
            optionId:        o.id,
            optionName:      o.name,
            // isVariant price is captured in unitPrice → store 0 to avoid double-counting
            price:           g.isVariant ? 0 : Number(o.price),
          }))
      )
    );
    return result;
  }

  function handleAdd() {
    if (hasVariants && !selectedVariantId) {
      setError(`Selecciona una opción en "${product.variantGroupName ?? "Variante"}"`);
      return;
    }
    for (const g of visibleGroups()) {
      const count = selections[g.id]?.length ?? 0;
      if (count < g.min) {
        setError(
          g.min === 1
            ? `Selecciona al menos una opción en "${g.name}"`
            : `Selecciona al menos ${g.min} opciones en "${g.name}"`
        );
        return;
      }
    }
    setError(null);

    const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
    const isVariantOption = visibleGroups()
      .filter(g => g.isVariant)
      .flatMap(g => g.options.filter(o => (selections[g.id] ?? []).includes(o.id)))[0];
    const unitPrice = isVariantOption
      ? Number(isVariantOption.price)
      : selectedVariant
      ? Number(selectedVariant.price)
      : Number(product.basePrice);

    // Agregar producto principal
    addItem({
      productId:       product.id,
      productName:     product.name,
      productImage:    product.images[0]?.url ?? null,
      unitPrice,
      quantity,
      selectedOptions: buildSelectedOptions(),
      notes,
      total:           calcMainTotal(),
    });

    // Agregar cada sugerencia seleccionada como ítem independiente
    for (const s of activeSuggestions) {
      if (!selectedSuggestions.has(s.id)) continue;
      const firstVariant = s.variants[0];
      const sugPrice = firstVariant ? Number(firstVariant.price) : Number(s.basePrice);
      addItem({
        productId:       s.id,
        productName:     s.name,
        productImage:    s.images[0]?.url ?? null,
        unitPrice:       sugPrice,
        quantity:        1,
        selectedOptions: firstVariant
          ? [{ optionGroupId: "variant", optionGroupName: "Variante", optionId: firstVariant.id, optionName: firstVariant.name, price: Number(firstVariant.price) }]
          : [],
        total: sugPrice,
      });
    }

    onClose();
  }

  const suggestionsCount = selectedSuggestions.size;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
        animation: "fadeIn 0.2s ease",
      }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>

      <div style={{
        width: "100%", maxWidth: 640, margin: "0 auto",
        background: "var(--menu-bg)", borderRadius: "24px 24px 0 0",
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
      }}>

        {/* Gallery */}
        {product.images.length > 0 ? (
          <div style={{ position: "relative", height: 240, background: "#111", flexShrink: 0 }}>
            <img src={product.images[imgIndex].url} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)" }} />
            {product.images.length > 1 && (
              <>
                <button onClick={() => setImgIndex(i => Math.max(0, i - 1))}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ‹
                </button>
                <button onClick={() => setImgIndex(i => Math.min(product.images.length - 1, i + 1))}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ›
                </button>
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                  {product.images.map((_, i) => (
                    <button key={i} onClick={() => setImgIndex(i)}
                      style={{ width: i === imgIndex ? 20 : 7, height: 7, borderRadius: 4, border: "none", background: i === imgIndex ? "#fff" : "rgba(255,255,255,0.4)", padding: 0, cursor: "pointer", transition: "all 0.2s" }} />
                  ))}
                </div>
              </>
            )}
            <button onClick={onClose}
              style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>
        ) : (
          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 16px", flexShrink: 0 }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--menu-border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--menu-muted)" }}>✕ Cerrar</button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>

          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 22, color: "var(--menu-primary)", margin: "0 0 6px", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
              {product.name}
            </h2>
            {product.description && (
              <p style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--menu-muted)", lineHeight: 1.6, margin: 0 }}>
                {product.description}
              </p>
            )}
          </div>

          {/* Variantes */}
          {hasVariants && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 15, color: "var(--menu-primary)", margin: 0 }}>
                  {product.variantGroupName ?? "Elige tu opción"}
                </h3>
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600, background: "#FEF3C7", color: "#92400E" }}>
                  Requerido
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {product.variants.map(variant => {
                  const isSelected = selectedVariantId === variant.id;
                  return (
                    <button key={variant.id} onClick={() => setSelectedVariantId(isSelected ? null : variant.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                        border: `1.5px solid ${isSelected ? "var(--menu-accent)" : "var(--menu-border)"}`,
                        background: isSelected ? "rgba(224,61,30,0.06)" : "#fff",
                        transition: "all 0.15s",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: `2px solid ${isSelected ? "var(--menu-accent)" : "#D1D5DB"}`,
                          background: isSelected ? "var(--menu-accent)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s",
                        }}>
                          {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--menu-primary)" }}>
                          {variant.name}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 600, fontSize: 14, color: "var(--menu-accent)", flexShrink: 0 }}>
                        {formatCurrency(Number(variant.price))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Complementos/Extras */}
          {visibleGroups().map(group => (
            <OptionGroupSection key={group.id} group={group}
              selected={selections[group.id] ?? []}
              onToggle={(optId) => toggleOption(group.id, optId, group.multiple, group.max)} />
          ))}

          {/* Notas */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 600, color: "var(--menu-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Notas especiales
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Sin cebolla, extra salsa..."
              style={{ width: "100%", minHeight: 72, border: "1px solid var(--menu-border)", borderRadius: 10, padding: "10px 12px", fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--menu-primary)", background: "transparent", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* ── Suelen comprarse juntos ── */}
          {activeSuggestions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 15, color: "var(--menu-primary)", margin: "0 0 4px" }}>
                Suelen comprarse juntos
              </h3>
              <p style={{ fontFamily: "var(--font-nunito)", fontSize: 12, color: "var(--menu-muted)", margin: "0 0 12px" }}>
                Selecciona los que quieras agregar
              </p>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                {activeSuggestions.map(s => {
                  const price = s.variants[0] ? Number(s.variants[0].price) : Number(s.basePrice);
                  const isSelected = selectedSuggestions.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSuggestion(s.id)}
                      style={{
                        flexShrink: 0, width: 130, padding: 0,
                        border: `2px solid ${isSelected ? "var(--menu-accent)" : "var(--menu-border)"}`,
                        borderRadius: 14, overflow: "hidden",
                        background: isSelected ? "rgba(224,61,30,0.04)" : "#fff",
                        display: "flex", flexDirection: "column",
                        cursor: "pointer", textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s",
                        position: "relative",
                      }}
                    >
                      {/* Checkmark badge */}
                      {isSelected && (
                        <div style={{
                          position: "absolute", top: 6, right: 6, zIndex: 2,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "var(--menu-accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      {s.images[0] ? (
                        <img src={s.images[0].url} alt={s.name}
                          style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: 80, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                          🍽️
                        </div>
                      )}
                      <div style={{ padding: "8px 10px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <p style={{
                          fontFamily: "var(--font-nunito)", fontSize: 12, fontWeight: 600,
                          color: "var(--menu-primary)", margin: 0, lineHeight: 1.3,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>
                          {s.name}
                        </p>
                        <p style={{ fontFamily: "var(--font-nunito)", fontSize: 12, color: "var(--menu-accent)", fontWeight: 700, margin: 0 }}>
                          +{formatCurrency(price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626", fontFamily: "var(--font-nunito)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer sticky */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--menu-border)", background: "var(--menu-bg)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--menu-border)", borderRadius: 100, overflow: "hidden" }}>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ width: 40, height: 40, background: "none", border: "none", fontSize: 20, color: "var(--menu-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                −
              </button>
              <span style={{ minWidth: 28, textAlign: "center", fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 15, color: "var(--menu-primary)" }}>
                {quantity}
              </span>
              <button onClick={() => setQuantity(q => q + 1)}
                style={{ width: 40, height: 40, background: "none", border: "none", fontSize: 20, color: "var(--menu-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                +
              </button>
            </div>

            <button onClick={handleAdd} disabled={!product.isAvailable}
              style={{
                flex: 1, padding: "13px 20px",
                background: product.isAvailable ? "var(--menu-primary)" : "#ccc",
                border: "none", borderRadius: 100,
                fontFamily: "var(--font-nunito)", fontWeight: 800, fontSize: 15,
                color: "#fff", cursor: product.isAvailable ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
              <span>
                {product.isAvailable
                  ? suggestionsCount > 0
                    ? `Agregar al pedido (+${suggestionsCount} extra${suggestionsCount > 1 ? "s" : ""})`
                    : "Agregar al pedido"
                  : "No disponible"}
              </span>
              <span>{formatCurrency(calcTotal())}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionGroupSection({ group, selected, onToggle }: {
  group: OptionGroupWithOptions;
  selected: string[];
  onToggle: (optId: string) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 15, color: "var(--menu-primary)", margin: "0 0 2px" }}>
            {normalizeCustomizationLabel(group.name)}
          </h3>
          {group.description && (
            <p style={{ fontFamily: "var(--font-nunito)", fontSize: 12, color: "var(--menu-muted)", margin: 0, lineHeight: 1.4 }}>
              {normalizeCustomizationLabel(group.description)}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-nunito)", fontSize: 11, color: "var(--menu-muted)", margin: "2px 0 0" }}>
            {group.min > 0 && group.max !== null && group.min === group.max
              ? `Elige exactamente ${group.min}`
              : group.min > 0 && group.max !== null
              ? `Entre ${group.min} y ${group.max} opciones`
              : group.min > 0
              ? `Mínimo ${group.min} opción${group.min > 1 ? "es" : ""}`
              : group.max !== null
              ? `Hasta ${group.max} opción${group.max > 1 ? "es" : ""}`
              : group.multiple
              ? "Elige las que quieras"
              : ""}
            {group.multiple && (
              <span style={{ marginLeft: 6, color: selected.length > 0 ? "var(--menu-accent)" : "var(--menu-muted)" }}>
                · {selected.length}{group.max !== null ? `/${group.max}` : ""} elegida{selected.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <span style={{
          fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
          background: group.isVariant ? "#EDE9FE" : group.required ? "#FEF3C7" : "#F3F4F6",
          color: group.isVariant ? "#6D28D9" : group.required ? "#92400E" : "var(--menu-muted)",
        }}>
          {group.isVariant ? "Define precio" : group.required ? "Requerido" : "Opcional"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {group.options.filter(o => o.isAvailable).map(option => {
          const isSelected = selected.includes(option.id);
          return (
            <button key={option.id} onClick={() => onToggle(option.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                border: `1.5px solid ${isSelected ? "var(--menu-accent)" : "var(--menu-border)"}`,
                background: isSelected ? "rgba(224,61,30,0.06)" : "#fff",
                transition: "all 0.15s",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 18, height: 18,
                  borderRadius: group.multiple ? 4 : "50%",
                  border: `2px solid ${isSelected ? "var(--menu-accent)" : "#D1D5DB"}`,
                  background: isSelected ? "var(--menu-accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s",
                }}>
                  {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--menu-primary)", textAlign: "left" }}>
                  {option.name}
                  {option.description && <span style={{ display: "block", fontSize: 12, color: "var(--menu-muted)" }}>{option.description}</span>}
                </span>
              </div>
              {Number(option.price) > 0 && (
                <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 600, fontSize: 14, color: "var(--menu-accent)", flexShrink: 0 }}>
                  {group.isVariant ? "" : "+"}{formatCurrency(Number(option.price))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
