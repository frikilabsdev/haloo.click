"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { TenantWithRelations } from "@/types";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";

interface Props {
  tenant: TenantWithRelations;
  onClose: () => void;
  isOpen?: boolean | null; // null = sin horario configurado (siempre abierto)
}

export function CartDrawer({ tenant, onClose, isOpen = null }: Props) {
  const closed = isOpen === false; // null = sin config → permitir
  const items = useCartStore(s => s.items);
  const total = useCartStore(s => s.total);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease",
      }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: "100%", maxWidth: 420,
        background: "var(--menu-bg)", display: "flex", flexDirection: "column",
        animation: "slideRight 0.3s cubic-bezier(0.32,0.72,0,1)",
      }}>

        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--menu-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700, fontSize: 22, color: "var(--menu-primary)", margin: 0 }}>
            Mi pedido
          </h2>
          <button onClick={onClose}
            style={{ background: "none", border: "1px solid var(--menu-border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--menu-muted)" }}>
            ✕ Cerrar
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
              <p style={{ fontFamily: "var(--font-dm)", color: "var(--menu-muted)", fontSize: 14 }}>
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map(item => (
                <div key={item.id} style={{ background: "#fff", border: "1px solid var(--menu-border)", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 14, color: "var(--menu-primary)", margin: "0 0 4px" }}>
                        {item.productName}
                      </p>
                      {item.selectedOptions.length > 0 && (
                        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--menu-muted)", margin: 0, lineHeight: 1.5 }}>
                          {item.selectedOptions.map(o => o.optionName).join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--menu-muted)", margin: "4px 0 0", fontStyle: "italic" }}>
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)}
                      style={{ background: "none", border: "none", fontSize: 16, color: "#9CA3AF", cursor: "pointer", padding: 2, lineHeight: 1 }}>
                      ✕
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Cantidad */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--menu-border)", borderRadius: 100 }}>
                      <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                        style={{ width: 32, height: 32, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--menu-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        −
                      </button>
                      <span style={{ minWidth: 24, textAlign: "center", fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13 }}>
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ width: 32, height: 32, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--menu-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        +
                      </button>
                    </div>
                    <span style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 15, color: "var(--menu-accent)" }}>
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--menu-border)" }}>
            {closed && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🕐</span>
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "#DC2626", margin: 0, fontWeight: 500 }}>
                  El restaurante está cerrado ahora. No puedes completar el pedido.
                </p>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-dm)", fontSize: 15, color: "var(--menu-muted)" }}>Total</span>
              <span style={{ fontFamily: "var(--font-fraunces)", fontWeight: 700, fontSize: 22, color: "var(--menu-primary)" }}>
                {formatCurrency(total())}
              </span>
            </div>
            {closed ? (
              <div style={{
                display: "block", padding: "15px 20px", background: "#9CA3AF",
                borderRadius: 100, textAlign: "center",
                fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 16, color: "#fff",
              }}>
                Restaurante cerrado
              </div>
            ) : (
              <Link
                href={`/${tenant.slug}/checkout`}
                onClick={onClose}
                style={{
                  display: "block", padding: "15px 20px", background: "var(--menu-primary)",
                  borderRadius: 100, textAlign: "center", textDecoration: "none",
                  fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 16, color: "#fff",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}>
                Ir a finalizar pedido →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
