import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  tenantSlug: string | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setTenant: (slug: string) => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tenantSlug: null,

      setTenant: (slug) => {
        const current = get().tenantSlug;
        if (current && current !== slug) {
          set({ tenantSlug: slug, items: [] });
        } else {
          set({ tenantSlug: slug });
        }
      },

      addItem: (item) => {
        const id = crypto.randomUUID();
        set(state => ({ items: [...state.items, { ...item, id }] }));
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set(state => ({
          items: state.items.map(i => {
            if (i.id !== id) return i;
            // Recalcular total: unitPrice (base/variante) + extras de selectedOptions
            // Filtramos optionGroupId="variant" para no contar doble el precio de ProductVariant
            const extras = i.selectedOptions
              .filter(o => o.optionGroupId !== "variant")
              .reduce((s, o) => s + o.price, 0);
            return { ...i, quantity, total: (i.unitPrice + extras) * quantity };
          }),
        })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.total, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "haloo-cart" }
  )
);
