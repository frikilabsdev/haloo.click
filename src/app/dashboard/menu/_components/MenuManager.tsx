"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProductSummary {
  id:          string;
  name:        string;
  basePrice:   string;
  isActive:    boolean;
  isAvailable: boolean;
  images:      Array<{ url: string }>;
}

interface CategoryRow {
  id:          string;
  name:        string;
  description: string | null;
  isActive:    boolean;
  position:    number;
  products:    ProductSummary[];
}

interface OptionData {
  id:            string;
  name:          string;
  description:   string | null;
  price:         string;
  isAvailable:   boolean;
  position:      number;
  optionGroupId: string;
}

interface VariantData {
  id:          string;
  name:        string;
  price:       string; // Decimal as string from Prisma
  isAvailable: boolean;
  position:    number;
}

interface GroupData {
  id:           string;
  name:         string;
  internalName: string | null;
  description:  string | null;
  required:     boolean;
  multiple:     boolean;
  min:          number;
  max:          number | null;
  position:     number;
  options:      OptionData[];
}

interface ProductDetail extends ProductSummary {
  description:      string | null;
  categoryId:       string;
  variantGroupName: string | null;
  variants:         VariantData[];
  optionGroups:     GroupData[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialCategories: CategoryRow[];
  tenantSlug:        string;
}

// ── Compresión de imagen (client-side, antes de subir) ────────────────────────

/**
 * Redimensiona y comprime una imagen usando Canvas.
 * Salida: JPEG, máx 1200px en el lado mayor, calidad 0.85.
 * Típicamente reduce una foto de 3–5 MB a menos de 200 KB.
 */
async function compressImage(file: File, maxDim = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img       = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calcular dimensiones manteniendo proporción
      let { width, height } = img;
      const ratio  = Math.min(1, maxDim / Math.max(width, height));
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas no disponible")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("Compresión fallida")); return; }
        const out = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, ".jpg"),
          { type: "image/jpeg" }
        );
        resolve(out);
      }, "image/jpeg", quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = objectUrl;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(num);
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Error del servidor." };
    return json;
  } catch {
    return { error: "Error de conexión." };
  }
}

// ── Componente principal ───────────────────────────────────────────────────────

export function MenuManager({ initialCategories, tenantSlug }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);

  // Modal de categoría
  const [catModal, setCatModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    category?: CategoryRow;
  }>({ open: false, mode: "create" });

  // Modal de producto (crear/editar)
  const [prodModal, setProdModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    categoryId?: string;
    productId?: string;
  }>({ open: false, mode: "create" });

  // Acordeón — categorías abiertas
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Recargar categorías desde API ─────────────────────────────────────────

  const reload = useCallback(async () => {
    const res = await apiFetch<CategoryRow[]>("/api/menu/categories");
    if (res.data) setCategories(res.data);
  }, []);

  // ── Handlers de categoría ─────────────────────────────────────────────────

  const handleDeleteCategory = async (cat: CategoryRow) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"? También se eliminarán sus productos.`)) return;
    const res = await apiFetch(`/api/menu/categories/${cat.id}`, { method: "DELETE" });
    if (res.error) { alert(res.error); return; }
    await reload();
  };

  const handleToggleCategoryActive = async (cat: CategoryRow) => {
    const res = await apiFetch(`/api/menu/categories/${cat.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    if (res.error) { alert(res.error); return; }
    await reload();
  };

  // ── Handlers de producto ──────────────────────────────────────────────────

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    const res = await apiFetch(`/api/menu/products/${productId}`, { method: "DELETE" });
    if (res.error) { alert(res.error); return; }
    await reload();
  };

  const handleToggleProduct = async (
    productId: string,
    field: "isActive" | "isAvailable",
    current: boolean
  ) => {
    const res = await apiFetch(`/api/menu/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: !current }),
    });
    if (res.error) { alert(res.error); return; }
    await reload();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ─── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 22, color: "var(--dash-text)", margin: "0 0 4px" }}>
            Tu menú
          </h1>
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>
            Gestiona categorías, productos y opciones de tu restaurante.
          </p>
        </div>
        <Link
          href={`/${tenantSlug}`}
          target="_blank"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 500,
            color: "var(--dash-orange)", textDecoration: "none",
            padding: "8px 14px", borderRadius: 8,
            background: "var(--dash-orange-soft)",
            border: "1px solid transparent",
            flexShrink: 0,
          }}
        >
          <IconExternalLink size={13} />
          Ver menú público
        </Link>
      </div>

      {/* ── Lista de categorías ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {categories.length === 0 && (
          <div style={{
            background: "var(--dash-surface)", border: "1px dashed var(--dash-border)",
            borderRadius: 14, padding: "48px 24px", textAlign: "center",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--dash-orange-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--dash-orange)" }}>
              <IconMenuList size={22} />
            </div>
            <p style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 15, color: "var(--dash-text)", margin: "0 0 6px" }}>
              Sin categorías aún
            </p>
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: 0 }}>
              Crea tu primera categoría para empezar a agregar productos.
            </p>
          </div>
        )}

        {categories.map(cat => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            isOpen={openCats.has(cat.id)}
            onToggle={() => toggleCat(cat.id)}
            onEdit={() => setCatModal({ open: true, mode: "edit", category: cat })}
            onDelete={() => handleDeleteCategory(cat)}
            onToggleActive={() => handleToggleCategoryActive(cat)}
            onAddProduct={() => {
              setProdModal({ open: true, mode: "create", categoryId: cat.id });
              setOpenCats(prev => new Set([...prev, cat.id]));
            }}
            onEditProduct={(productId) => setProdModal({ open: true, mode: "edit", productId })}
            onDeleteProduct={(productId, name) => handleDeleteProduct(productId, name)}
            onToggleProduct={handleToggleProduct}
          />
        ))}

        {/* Botón nueva categoría */}
        <button
          onClick={() => setCatModal({ open: true, mode: "create" })}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 18px", borderRadius: 12,
            border: "2px dashed var(--dash-border)",
            background: "transparent", cursor: "pointer",
            fontFamily: "var(--font-dm)", fontSize: 14, fontWeight: 500,
            color: "var(--dash-muted)", transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dash-orange)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--dash-orange)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--dash-orange-soft)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dash-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--dash-muted)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <IconPlus size={16} />
          Nueva categoría
        </button>
      </div>

      {/* ── Modal de categoría ─── */}
      {catModal.open && (
        <CategoryModal
          mode={catModal.mode}
          category={catModal.category}
          onClose={() => setCatModal({ open: false, mode: "create" })}
          onSaved={async () => {
            setCatModal({ open: false, mode: "create" });
            await reload();
          }}
        />
      )}

      {/* ── Modal de producto ─── */}
      {prodModal.open && (
        <ProductModal
          mode={prodModal.mode}
          categoryId={prodModal.categoryId}
          productId={prodModal.productId}
          categories={categories}
          onClose={() => setProdModal({ open: false, mode: "create" })}
          onSaved={async () => {
            setProdModal({ open: false, mode: "create" });
            await reload();
          }}
        />
      )}
    </div>
  );
}

// ── CategoryCard ───────────────────────────────────────────────────────────────

interface CategoryCardProps {
  cat:              CategoryRow;
  isOpen:           boolean;
  onToggle:         () => void;
  onEdit:           () => void;
  onDelete:         () => void;
  onToggleActive:   () => void;
  onAddProduct:     () => void;
  onEditProduct:    (id: string) => void;
  onDeleteProduct:  (id: string, name: string) => void;
  onToggleProduct:  (id: string, field: "isActive" | "isAvailable", current: boolean) => void;
}

function CategoryCard({
  cat, isOpen, onToggle, onEdit, onDelete, onToggleActive,
  onAddProduct, onEditProduct, onDeleteProduct, onToggleProduct,
}: CategoryCardProps) {
  return (
    <div style={{
      background: "var(--dash-surface)",
      border: "1px solid var(--dash-border)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* ── Cabecera de categoría ─── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px",
        borderBottom: isOpen ? "1px solid var(--dash-border)" : "none",
      }}>
        {/* Botón acordeón */}
        <button
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: 0, textAlign: "left",
          }}
        >
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20,
            color: "var(--dash-muted)",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}>
            <IconChevron size={14} />
          </span>
          <div>
            <span style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 14, color: "var(--dash-text)" }}>
              {cat.name}
            </span>
            <span style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", marginLeft: 8 }}>
              ({cat.products.length} producto{cat.products.length !== 1 ? "s" : ""})
            </span>
          </div>
        </button>

        {/* Badge activo */}
        <button
          onClick={onToggleActive}
          title={cat.isActive ? "Activa — clic para desactivar" : "Inactiva — clic para activar"}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 100, border: "none", cursor: "pointer",
            fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600,
            background: cat.isActive ? "var(--dash-green-soft)" : "var(--dash-red-soft)",
            color: cat.isActive ? "var(--dash-green)" : "var(--dash-red)",
            transition: "all 0.15s",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
          {cat.isActive ? "Activa" : "Inactiva"}
        </button>

        {/* Acciones */}
        <button
          onClick={onEdit}
          title="Editar categoría"
          style={iconBtnStyle}
        >
          <IconEdit size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Eliminar categoría"
          style={{ ...iconBtnStyle, color: "var(--dash-red)" }}
        >
          <IconTrash size={14} />
        </button>
      </div>

      {/* ── Productos (acordeón) ─── */}
      {isOpen && (
        <div style={{ padding: "8px 0" }}>
          {cat.products.length === 0 && (
            <p style={{
              fontFamily: "var(--font-dm)", fontSize: 13,
              color: "var(--dash-muted)", padding: "10px 20px", margin: 0,
            }}>
              Sin productos en esta categoría.
            </p>
          )}

          {cat.products.map(product => (
            <ProductRow
              key={product.id}
              product={product}
              onEdit={() => onEditProduct(product.id)}
              onDelete={() => onDeleteProduct(product.id, product.name)}
              onToggle={onToggleProduct}
            />
          ))}

          {/* Agregar producto */}
          <button
            onClick={onAddProduct}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              margin: "6px 16px 8px",
              padding: "8px 14px", borderRadius: 8,
              border: "1px dashed var(--dash-border)",
              background: "transparent", cursor: "pointer",
              fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 500,
              color: "var(--dash-muted)", transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dash-orange)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--dash-orange)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--dash-orange-soft)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dash-border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--dash-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <IconPlus size={14} />
            Agregar producto
          </button>
        </div>
      )}
    </div>
  );
}

// ── ProductRow ─────────────────────────────────────────────────────────────────

interface ProductRowProps {
  product:  ProductSummary;
  onEdit:   () => void;
  onDelete: () => void;
  onToggle: (id: string, field: "isActive" | "isAvailable", current: boolean) => void;
}

function ProductRow({ product, onEdit, onDelete, onToggle }: ProductRowProps) {
  const [loadingActive, setLoadingActive]    = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const handleToggle = async (field: "isActive" | "isAvailable") => {
    if (field === "isActive") setLoadingActive(true);
    else setLoadingAvailable(true);
    await onToggle(product.id, field, field === "isActive" ? product.isActive : product.isAvailable);
    setLoadingActive(false);
    setLoadingAvailable(false);
  };

  const imageUrl = product.images[0]?.url;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px",
      borderBottom: "1px solid var(--dash-border)",
    }}>
      {/* Imagen */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: "hidden",
        background: "var(--dash-canvas)", border: "1px solid var(--dash-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <IconImage size={16} color="var(--dash-muted)" />
        )}
      </div>

      {/* Nombre y precio */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, color: "var(--dash-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.name}
        </p>
        <p style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 12, color: "var(--dash-orange)", margin: "2px 0 0" }}>
          {formatPrice(product.basePrice)}
        </p>
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ToggleBadge
          label="Activo"
          active={product.isActive}
          loading={loadingActive}
          onClick={() => handleToggle("isActive")}
        />
        <ToggleBadge
          label="Disponible"
          active={product.isAvailable}
          loading={loadingAvailable}
          onClick={() => handleToggle("isAvailable")}
          colorOff="var(--dash-amber)"
          softOff="var(--dash-amber-soft)"
        />
      </div>

      {/* Acciones */}
      <button onClick={onEdit} title="Editar producto" style={iconBtnStyle}>
        <IconEdit size={14} />
      </button>
      <button onClick={onDelete} title="Eliminar producto" style={{ ...iconBtnStyle, color: "var(--dash-red)" }}>
        <IconTrash size={14} />
      </button>
    </div>
  );
}

// ── ToggleBadge ────────────────────────────────────────────────────────────────

function ToggleBadge({
  label, active, loading, onClick,
  colorOff = "var(--dash-red)",
  softOff  = "var(--dash-red-soft)",
}: {
  label:     string;
  active:    boolean;
  loading:   boolean;
  onClick:   () => void;
  colorOff?: string;
  softOff?:  string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 100, border: "none", cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600,
        opacity: loading ? 0.6 : 1,
        background: active ? "var(--dash-green-soft)" : softOff,
        color: active ? "var(--dash-green)" : colorOff,
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
      {label}
    </button>
  );
}

// ── CategoryModal ──────────────────────────────────────────────────────────────

interface CategoryModalProps {
  mode:      "create" | "edit";
  category?: CategoryRow;
  onClose:   () => void;
  onSaved:   () => Promise<void>;
}

function CategoryModal({ mode, category, onClose, onSaved }: CategoryModalProps) {
  const [name, setName]               = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("El nombre es requerido."); return; }
    setLoading(true);

    const payload = { name: name.trim(), description: description.trim() || null };
    let res;

    if (mode === "create") {
      res = await apiFetch("/api/menu/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch(`/api/menu/categories/${category!.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    setLoading(false);
    if (res.error) { setError(res.error); return; }
    await onSaved();
  };

  return (
    <Modal onClose={onClose} title={mode === "create" ? "Nueva categoría" : "Editar categoría"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Nombre *">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Pizzas, Bebidas, Postres…"
            style={inputStyle}
            autoFocus
            maxLength={80}
          />
        </FormField>
        <FormField label="Descripción">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descripción opcional…"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
            maxLength={300}
          />
        </FormField>
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnSecondaryStyle}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} style={btnPrimaryStyle(loading)}>
            {loading ? "Guardando…" : mode === "create" ? "Crear categoría" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── ProductModal ───────────────────────────────────────────────────────────────

interface ProductModalProps {
  mode:        "create" | "edit";
  categoryId?: string;
  productId?:  string;
  categories:  CategoryRow[];
  onClose:     () => void;
  onSaved:     () => Promise<void>;
}

function ProductModal({ mode, categoryId, productId, categories, onClose, onSaved }: ProductModalProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  // Campos básicos
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice]     = useState("");
  const [selCategoryId, setSelCategoryId] = useState(categoryId ?? "");
  const [isActive, setIsActive]       = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl]       = useState("");

  // Grupos de opciones (estado local para edición inline)
  const [groups, setGroups] = useState<GroupData[]>([]);

  // Variantes (solo en create)
  const [hasVariants, setHasVariants]             = useState(false);
  const [variantGroupLabel, setVariantGroupLabel] = useState("");
  const [variantRows, setVariantRows]             = useState<Array<{ name: string; price: string }>>([{ name: "", price: "" }]);

  // Imagen
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  // Variantes en modo edit
  const [variantGroupName, setVariantGroupName] = useState("");
  const [variants, setVariants] = useState<VariantData[]>([]);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [addingVariant, setAddingVariant] = useState(false);
  const [variantError, setVariantError] = useState("");

  // Nuevo grupo inline (solo en edit)
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup]   = useState(false);
  const [groupError, setGroupError]     = useState("");

  // Selector de complementos existentes
  const [showGroupPicker, setShowGroupPicker]   = useState(false);
  const [allGroups, setAllGroups]               = useState<GroupData[]>([]);
  const [loadingAllGroups, setLoadingAllGroups] = useState(false);
  const [pickerSearch, setPickerSearch]         = useState("");

  // Sugerencias "suelen comprarse juntos"
  interface SuggestionRow { id: string; position: number; suggestedProduct: ProductSummary & { variants: { id: string; name: string; price: string }[] } }
  const [suggestions, setSuggestions]               = useState<SuggestionRow[]>([]);
  const [showSuggestionPicker, setShowSuggestionPicker] = useState(false);
  const [suggestionSearch, setSuggestionSearch]     = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Estado de nueva opción por grupo
  const [newOptionByGroup, setNewOptionByGroup] = useState<Record<string, string>>({});
  const [addingOptionFor, setAddingOptionFor]   = useState<string | null>(null);

  // Cargar producto al abrir en modo edit
  useState(() => {
    if (mode === "edit" && productId) {
      apiFetch<ProductDetail>(`/api/menu/products/${productId}`).then(res => {
        if (res.data) {
          const p = res.data;
          setProduct(p);
          setName(p.name);
          setDescription(p.description ?? "");
          setBasePrice(parseFloat(p.basePrice).toFixed(2));
          setSelCategoryId(p.categoryId);
          setIsActive(p.isActive);
          setIsAvailable(p.isAvailable);
          setImageUrl(p.images[0]?.url ?? "");
          setVariantGroupName(p.variantGroupName ?? "");
          setVariants(p.variants ?? []);
          setGroups(p.optionGroups);
        }
        setLoading(false);
      });
      // Cargar sugerencias
      apiFetch<SuggestionRow[]>(`/api/menu/products/${productId}/suggestions`).then(res => {
        if (res.data) setSuggestions(res.data);
      });
    }
  });

  // ── Subida de imagen (con compresión client-side) ─────────────────────────

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato (antes de comprimir)
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setImageUploading(true);
    try {
      // 1. Comprimir: máx 1200px, JPEG 85% — de 3–5 MB a ~150 KB
      const compressed = await compressImage(file);

      // 2. Subir al servidor
      const fd = new FormData();
      fd.append("file", compressed);
      const res  = await fetch("/api/menu/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) setImageUrl(json.url);
      else alert(json.error ?? "Error al subir imagen.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al procesar imagen.");
    }
    setImageUploading(false);
  };

  // ── Guardar producto ──────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGroupError("");
    setVariantError("");
    if (!name.trim()) { setError("El nombre es requerido."); return; }
    if (!selCategoryId) { setError("Selecciona una categoría."); return; }

    // Calcular precio
    let price: number;
    if (hasVariants && mode === "create") {
      for (const row of variantRows) {
        if (!row.name.trim()) { setError("Todas las variantes deben tener nombre."); return; }
        const p = parseFloat(row.price);
        if (isNaN(p) || p < 0) { setError("Precio de variante inválido."); return; }
      }
      price = Math.min(...variantRows.map(r => parseFloat(r.price) || 0));
    } else {
      price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) { setError("Precio inválido."); return; }
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      basePrice: price,
      categoryId: selCategoryId,
      isActive,
      isAvailable,
      imageUrl: imageUrl.trim() || null,
    };

    let res;
    if (mode === "create") {
      res = await apiFetch<ProductDetail>("/api/menu/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch<ProductDetail>(`/api/menu/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    if (res.error) { setSaving(false); setError(res.error); return; }

    // Si es nuevo y tiene variantes: usar la nueva API de variantes
    if (mode === "create" && hasVariants && res.data) {
      const newProductId = res.data.id;

      // 1. Si hay label del grupo, actualizar variantGroupName del producto
      if (variantGroupLabel.trim()) {
        await apiFetch(`/api/menu/products/${newProductId}/variants`, {
          method: "POST",
          body: JSON.stringify({ variantGroupName: variantGroupLabel.trim() }),
        });
      }

      // 2. Crear cada variante
      for (const row of variantRows) {
        await apiFetch(`/api/menu/products/${newProductId}/variants`, {
          method: "POST",
          body: JSON.stringify({ name: row.name.trim(), price: parseFloat(row.price) || 0 }),
        });
      }
    }

    setSaving(false);
    await onSaved();
  };

  // ── Gestión de grupos ─────────────────────────────────────────────────────

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) { setGroupError("El nombre del complemento es requerido."); return; }
    if (!productId) { setGroupError("Guarda el producto primero."); return; }
    setGroupError("");
    setAddingGroup(true);

    // 1. Crear en la biblioteca del tenant
    const res = await apiFetch<GroupData>("/api/menu/groups", {
      method: "POST",
      body: JSON.stringify({ name: newGroupName.trim() }),
    });

    if (res.error) { setAddingGroup(false); setGroupError(res.error); return; }

    if (res.data) {
      // 2. Asignar al producto
      const assignRes = await apiFetch(`/api/menu/complements/${productId}`, {
        method: "POST",
        body: JSON.stringify({ optionGroupId: res.data.id }),
      });
      if (assignRes.error) { setAddingGroup(false); setGroupError(assignRes.error); return; }
      setGroups(prev => [...prev, res.data!]);
      setNewGroupName("");
    }
    setAddingGroup(false);
  };

  const handleOpenGroupPicker = async () => {
    setLoadingAllGroups(true);
    const res = await apiFetch<GroupData[]>("/api/menu/groups");
    if (res.data) setAllGroups(res.data);
    setLoadingAllGroups(false);
    setShowGroupPicker(true);
  };

  const handleAssignExisting = async (groupId: string) => {
    if (!productId) return;
    const res = await apiFetch(`/api/menu/complements/${productId}`, {
      method: "POST",
      body: JSON.stringify({ optionGroupId: groupId }),
    });
    if (res.error) { alert(res.error); return; }
    // Reload product groups
    const prod = await apiFetch<ProductDetail>(`/api/menu/products/${productId}`);
    if (prod.data) setGroups(prod.data.optionGroups);
    setShowGroupPicker(false);
    setPickerSearch("");
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("¿Quitar este complemento del producto?\n\nEl complemento seguirá en la biblioteca y disponible para otros productos.")) return;
    const res = await apiFetch(`/api/menu/complements/${productId}?groupId=${groupId}`, { method: "DELETE" });
    if (res.error) { alert(res.error); return; }
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  // ── Gestión de sugerencias "suelen comprarse juntos" ──────────────────────

  const handleAddSuggestion = async (suggestedProductId: string) => {
    if (!productId) return;
    setLoadingSuggestions(true);
    const res = await apiFetch(`/api/menu/products/${productId}/suggestions`, {
      method: "POST",
      body: JSON.stringify({ suggestedProductId }),
    });
    if (res.error) { alert(res.error); setLoadingSuggestions(false); return; }
    const refreshed = await apiFetch<SuggestionRow[]>(`/api/menu/products/${productId}/suggestions`);
    if (refreshed.data) setSuggestions(refreshed.data);
    setLoadingSuggestions(false);
    setShowSuggestionPicker(false);
    setSuggestionSearch("");
  };

  const handleRemoveSuggestion = async (suggestionId: string) => {
    if (!productId) return;
    const res = await apiFetch(`/api/menu/products/${productId}/suggestions?suggestionId=${suggestionId}`, { method: "DELETE" });
    if (res.error) { alert(res.error); return; }
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handlePatchGroup = async (
    groupId: string,
    field: "required" | "multiple",
    value: boolean
  ) => {
    const res = await apiFetch<GroupData>(`/api/menu/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    if (res.error) { alert(res.error); return; }
    if (res.data) {
      setGroups(prev => prev.map(g => g.id === groupId ? res.data! : g));
    }
  };

  // ── Gestión de variantes (edit mode) ─────────────────────────────────────

  const handleSaveVariantGroupName = async () => {
    if (!productId) return;
    await apiFetch(`/api/menu/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify({ variantGroupName: variantGroupName.trim() || null }),
    });
  };

  const handleAddVariant = async () => {
    if (!newVariantName.trim()) { setVariantError("El nombre es requerido."); return; }
    if (!productId) return;
    const price = parseFloat(newVariantPrice);
    if (isNaN(price) || price < 0) { setVariantError("Precio inválido."); return; }
    setVariantError("");
    setAddingVariant(true);
    const res = await apiFetch<VariantData>(`/api/menu/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify({ name: newVariantName.trim(), price }),
    });
    setAddingVariant(false);
    if (res.error) { setVariantError(res.error); return; }
    if (res.data) {
      setVariants(prev => [...prev, res.data!]);
      setNewVariantName("");
      setNewVariantPrice("");
    }
  };

  const handleToggleVariant = async (variant: VariantData) => {
    const res = await apiFetch<VariantData>(`/api/menu/variants/${variant.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: !variant.isAvailable }),
    });
    if (res.data) setVariants(prev => prev.map(v => v.id === variant.id ? res.data! : v));
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!window.confirm("¿Eliminar esta variante?")) return;
    const res = await apiFetch(`/api/menu/variants/${variantId}`, { method: "DELETE" });
    if (!res.error) setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  // ── Gestión de opciones ───────────────────────────────────────────────────

  const handleAddOption = async (groupId: string) => {
    const optionName = (newOptionByGroup[groupId] ?? "").trim();
    if (!optionName) return;
    setAddingOptionFor(groupId);

    const res = await apiFetch<OptionData>("/api/menu/options", {
      method: "POST",
      body: JSON.stringify({ groupId, name: optionName }),
    });

    setAddingOptionFor(null);
    if (res.error) { alert(res.error); return; }
    if (res.data) {
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, options: [...g.options, res.data!] } : g
      ));
      setNewOptionByGroup(prev => ({ ...prev, [groupId]: "" }));
    }
  };

  const handleDeleteOption = async (groupId: string, optionId: string) => {
    if (!window.confirm("¿Eliminar esta opción?")) return;
    const res = await apiFetch(`/api/menu/options/${optionId}`, { method: "DELETE" });
    if (res.error) { alert(res.error); return; }
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g
    ));
  };

  const handleToggleOptionAvailable = async (groupId: string, option: OptionData) => {
    const res = await apiFetch<OptionData>(`/api/menu/options/${option.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: !option.isAvailable }),
    });
    if (res.error) { alert(res.error); return; }
    if (res.data) {
      setGroups(prev => prev.map(g =>
        g.id === groupId
          ? { ...g, options: g.options.map(o => o.id === option.id ? res.data! : o) }
          : g
      ));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      onClose={onClose}
      title={mode === "create" ? "Nuevo producto" : "Editar producto"}
      wide
    >
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--dash-muted)", fontFamily: "var(--font-dm)", fontSize: 14 }}>
          Cargando…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── Info básica ─── */}
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Nombre */}
            <FormField label="Nombre *">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ej: Pizza Margherita" style={inputStyle} maxLength={120} autoFocus />
            </FormField>

            {/* Descripción */}
            <FormField label="Descripción">
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Descripción del producto…" rows={2}
                style={{ ...inputStyle, resize: "vertical" }} maxLength={500} />
            </FormField>

            {/* Categoría + Precio en grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Categoría *">
                <select value={selCategoryId} onChange={e => setSelCategoryId(e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              {/* Precio solo si no hay variantes (create) o siempre en edit */}
              {(mode === "edit" || !hasVariants) && (
                <FormField label="Precio (MXN) *">
                  <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)}
                    placeholder="0.00" style={inputStyle} min="0" step="0.01" />
                </FormField>
              )}
            </div>

            {/* ── ¿Tiene variantes? (solo create) ─── */}
            {mode === "create" && (
              <div style={{
                borderRadius: 10, border: "1px solid var(--dash-border)",
                padding: "14px 16px",
                background: hasVariants ? "var(--dash-orange-soft)" : "var(--dash-canvas)",
                transition: "background 0.2s",
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={hasVariants}
                    onChange={e => setHasVariants(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--dash-orange)", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600, color: "var(--dash-text)" }}>
                      ¿Este producto tiene variantes?
                    </span>
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: "2px 0 0" }}>
                      Ej: tamaños (Chica, Mediana, Grande), sabores. Cada variante tiene su propio precio.
                    </p>
                  </div>
                </label>

                {hasVariants && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Nombre del grupo */}
                    <FormField label="Nombre del grupo">
                      <input type="text" value={variantGroupLabel}
                        onChange={e => setVariantGroupLabel(e.target.value)}
                        placeholder="Ej: Tamaño, Sabor…" style={inputStyle} maxLength={80} />
                    </FormField>

                    {/* Encabezado filas */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 24px", gap: 8, paddingRight: 4 }}>
                      <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Nombre de la variante
                      </span>
                      <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Precio
                      </span>
                      <span />
                    </div>

                    {/* Filas de variantes */}
                    {variantRows.map((row, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 24px", gap: 8, alignItems: "center" }}>
                        <input
                          type="text" value={row.name}
                          onChange={e => setVariantRows(prev => prev.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                          placeholder={i === 0 ? "Ej: Chica" : i === 1 ? "Ej: Mediana" : "Ej: Grande"}
                          style={inputStyle} maxLength={80}
                        />
                        <input
                          type="number" value={row.price}
                          onChange={e => setVariantRows(prev => prev.map((r, j) => j === i ? { ...r, price: e.target.value } : r))}
                          placeholder="0.00" style={inputStyle} min="0" step="0.01"
                        />
                        <button
                          type="button"
                          onClick={() => setVariantRows(prev => prev.filter((_, j) => j !== i))}
                          disabled={variantRows.length === 1}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: 24, height: 24, borderRadius: 6,
                            border: "none", background: "none", cursor: variantRows.length === 1 ? "not-allowed" : "pointer",
                            color: variantRows.length === 1 ? "var(--dash-border)" : "var(--dash-red)",
                            padding: 0,
                          }}
                          title="Quitar variante"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Agregar fila */}
                    <button
                      type="button"
                      onClick={() => setVariantRows(prev => [...prev, { name: "", price: "" }])}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 8,
                        border: "1px dashed var(--dash-border)",
                        background: "rgba(255,255,255,0.5)", cursor: "pointer",
                        fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 500,
                        color: "var(--dash-orange)", alignSelf: "flex-start",
                      }}
                    >
                      <IconPlus size={12} />
                      Agregar variante
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Imagen ─── */}
            <FormField label="Imagen del producto">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Preview */}
                {(imagePreview || imageUrl) && (
                  <img
                    src={imagePreview || imageUrl} alt="Preview"
                    style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: "1px solid var(--dash-border)", flexShrink: 0 }}
                  />
                )}

                {/* Botón de carga */}
                <label style={{ flex: 1, cursor: imageUploading ? "not-allowed" : "pointer" }}>
                  <div style={{
                    border: "2px dashed var(--dash-border)", borderRadius: 8,
                    padding: "11px 14px", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "var(--dash-canvas)", opacity: imageUploading ? 0.6 : 1,
                    transition: "all 0.15s",
                  }}>
                    <IconImage size={16} color="var(--dash-muted)" />
                    <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)" }}>
                      {imageUploading ? "Subiendo…" : imageUrl ? "Cambiar imagen" : "Seleccionar imagen"}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-border)" }}>
                      JPG, PNG, WebP · máx 5 MB
                    </span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageSelect}
                    disabled={imageUploading} style={{ display: "none" }} />
                </label>

                {/* Quitar */}
                {imageUrl && !imageUploading && (
                  <button type="button"
                    onClick={() => { setImageUrl(""); setImagePreview(""); }}
                    style={{ ...iconBtnStyle, color: "var(--dash-red)" }} title="Quitar imagen">
                    <IconX size={14} />
                  </button>
                )}
              </div>
            </FormField>

            {/* Activo / Disponible */}
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)" }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--dash-orange)" }} />
                Activo
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)" }}>
                <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--dash-orange)" }} />
                Disponible
              </label>
            </div>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} style={btnSecondaryStyle}>
                {mode === "create" ? "Cancelar" : "Cerrar"}
              </button>
              <button type="submit" disabled={saving || imageUploading} style={btnPrimaryStyle(saving || imageUploading)}>
                {saving ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios"}
              </button>
            </div>
          </form>

          {/* ── Variantes (solo en modo edit) ─── */}
          {mode === "edit" && product && (
            <div style={{ borderTop: "1px solid var(--dash-border)", paddingTop: 20 }}>
              <SectionTitle>Variantes de precio</SectionTitle>
              <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: "0 0 14px" }}>
                El precio de la variante seleccionada REEMPLAZA el precio base del producto.
              </p>

              {/* Label del grupo de variantes */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={variantGroupName}
                  onChange={e => setVariantGroupName(e.target.value)}
                  onBlur={handleSaveVariantGroupName}
                  placeholder="Nombre del selector (ej: Tamaño, Sabor…)"
                  style={{ ...inputStyle, flex: 1 }}
                  maxLength={80}
                />
              </div>

              {/* Lista de variantes existentes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {variants.length === 0 && (
                  <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: "0 0 8px" }}>
                    Sin variantes. Agrega la primera.
                  </p>
                )}
                {variants.map(variant => (
                  <div key={variant.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--dash-border)", borderRadius: 8, background: variant.isAvailable ? "var(--dash-canvas)" : "#FFF5F5" }}>
                    <span style={{ flex: 1, fontFamily: "var(--font-dm)", fontSize: 13, color: variant.isAvailable ? "var(--dash-text)" : "var(--dash-muted)", textDecoration: variant.isAvailable ? "none" : "line-through" }}>
                      {variant.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm)", fontWeight: 700, fontSize: 13, color: "var(--dash-orange)", minWidth: 70, textAlign: "right" }}>
                      {formatPrice(variant.price)}
                    </span>
                    <ToggleBadge
                      label={variant.isAvailable ? "Disponible" : "No disp."}
                      active={variant.isAvailable}
                      loading={false}
                      onClick={() => handleToggleVariant(variant)}
                      colorOff="var(--dash-amber)"
                      softOff="var(--dash-amber-soft)"
                    />
                    <button
                      onClick={() => handleDeleteVariant(variant.id)}
                      style={{ ...iconBtnStyle, color: "var(--dash-red)" }}
                      title="Eliminar variante"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Agregar nueva variante */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={newVariantName}
                  onChange={e => setNewVariantName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddVariant())}
                  placeholder="Nombre (ej: Chica, Grande…)"
                  style={{ ...inputStyle, flex: 2 }}
                  maxLength={80}
                />
                <input
                  type="number"
                  value={newVariantPrice}
                  onChange={e => setNewVariantPrice(e.target.value)}
                  placeholder="Precio"
                  style={{ ...inputStyle, flex: 1 }}
                  min="0"
                  step="0.50"
                />
                <button
                  type="button"
                  onClick={handleAddVariant}
                  disabled={addingVariant}
                  style={btnPrimaryStyle(addingVariant)}
                >
                  {addingVariant ? "…" : "Agregar"}
                </button>
              </div>
              {variantError && <ErrorMsg style={{ marginTop: 6 }}>{variantError}</ErrorMsg>}
            </div>
          )}

          {/* ── Complementos (solo en modo edit) ─── */}
          {mode === "edit" && product && (
            <div>
              <div style={{ borderTop: "1px solid var(--dash-border)", paddingTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <SectionTitle>Complementos</SectionTitle>
                  <Link
                    href="/dashboard/menu/complements"
                    target="_blank"
                    style={{ fontSize: 12, color: "var(--dash-orange)", textDecoration: "none", fontFamily: "var(--font-dm)" }}
                  >
                    Abrir biblioteca →
                  </Link>
                </div>

                {groups.length === 0 && (
                  <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: "0 0 12px" }}>
                    Sin complementos. Agrega uno de la biblioteca o crea uno nuevo.
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {groups.map(group => (
                    <GroupEditor
                      key={group.id}
                      group={group}
                      newOptionName={newOptionByGroup[group.id] ?? ""}
                      onNewOptionNameChange={val => setNewOptionByGroup(prev => ({ ...prev, [group.id]: val }))}
                      addingOption={addingOptionFor === group.id}
                      onAddOption={() => handleAddOption(group.id)}
                      onDeleteOption={(optId) => handleDeleteOption(group.id, optId)}
                      onToggleOption={(opt) => handleToggleOptionAvailable(group.id, opt)}
                      onDeleteGroup={() => handleDeleteGroup(group.id)}
                      onPatchGroup={(field, value) => handlePatchGroup(group.id, field, value)}
                    />
                  ))}
                </div>

                {/* ── Acciones: agregar complemento ─── */}
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* Botón para seleccionar de la biblioteca */}
                  <button
                    type="button"
                    onClick={handleOpenGroupPicker}
                    disabled={loadingAllGroups}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "10px 16px", border: "1.5px dashed var(--dash-orange)",
                      borderRadius: 10, background: "var(--dash-orange-soft)",
                      fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600,
                      color: "var(--dash-orange)", cursor: loadingAllGroups ? "wait" : "pointer",
                    }}
                  >
                    {loadingAllGroups ? "Cargando…" : "+ Agregar complemento de la biblioteca"}
                  </button>

                  {/* Crear nuevo directamente */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontFamily: "var(--font-dm)", fontSize: 11, fontWeight: 700, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                      O crear nuevo
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddGroup())}
                        placeholder="Nombre del complemento (ej: Salsas, Extras…)"
                        style={{ ...inputStyle, flex: 1 }}
                        maxLength={80}
                      />
                      <button
                        type="button"
                        onClick={handleAddGroup}
                        disabled={addingGroup}
                        style={btnPrimaryStyle(addingGroup)}
                      >
                        {addingGroup ? "…" : "Crear"}
                      </button>
                    </div>
                  </div>
                </div>
                {groupError && <ErrorMsg style={{ marginTop: 6 }}>{groupError}</ErrorMsg>}
              </div>
            </div>
          )}

          {mode === "create" && (
            <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: 0, borderTop: "1px solid var(--dash-border)", paddingTop: 12 }}>
              Podrás agregar complementos (sabores, extras, tamaños) después de crear el producto.
            </p>
          )}

          {/* ── Suelen comprarse juntos (solo en modo edit) ─── */}
          {mode === "edit" && product && (
            <div style={{ borderTop: "1px solid var(--dash-border)", paddingTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionTitle>Suelen comprarse juntos</SectionTitle>
                <button
                  type="button"
                  onClick={() => { setShowSuggestionPicker(true); setSuggestionSearch(""); }}
                  style={{
                    padding: "5px 12px", border: "1.5px solid var(--dash-orange)",
                    borderRadius: 8, background: "var(--dash-orange-soft)",
                    fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600,
                    color: "var(--dash-orange)", cursor: "pointer",
                  }}
                >
                  + Agregar
                </button>
              </div>

              {suggestions.length === 0 && (
                <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", margin: "0 0 4px" }}>
                  Sin sugerencias. Agrega productos que suelen pedirse junto a este.
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {suggestions.map(s => {
                  const price = s.suggestedProduct.variants[0] ? Number(s.suggestedProduct.variants[0].price) : Number(s.suggestedProduct.basePrice);
                  return (
                    <div key={s.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", border: "1px solid var(--dash-border)",
                      borderRadius: 10, background: "var(--dash-canvas)",
                    }}>
                      {s.suggestedProduct.images[0] ? (
                        <img src={s.suggestedProduct.images[0].url} alt={s.suggestedProduct.name}
                          style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          🍽️
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "var(--font-dm)", fontSize: 14, fontWeight: 600, color: "var(--dash-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.suggestedProduct.name}
                        </p>
                        <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: 0 }}>
                          ${price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSuggestion(s.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 18, padding: 4, flexShrink: 0 }}
                        title="Quitar sugerencia"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Picker de productos a sugerir */}
              {showSuggestionPicker && (
                <div
                  onClick={() => setShowSuggestionPicker(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
                >
                  <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 16, color: "var(--dash-text)", margin: "0 0 14px" }}>
                      Agregar sugerencia
                    </h3>
                    <input
                      autoFocus
                      value={suggestionSearch}
                      onChange={e => setSuggestionSearch(e.target.value)}
                      placeholder="Buscar producto..."
                      style={{ ...inputStyle, marginBottom: 12 }}
                    />
                    <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      {categories
                        .flatMap(c => c.products)
                        .filter(p =>
                          p.id !== productId &&
                          p.name.toLowerCase().includes(suggestionSearch.toLowerCase()) &&
                          !suggestions.find(s => s.suggestedProduct.id === p.id)
                        )
                        .map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddSuggestion(p.id)}
                            disabled={loadingSuggestions}
                            style={{
                              textAlign: "left", padding: "10px 14px", border: "1px solid var(--dash-border)",
                              borderRadius: 10, background: "var(--dash-canvas)", cursor: "pointer",
                              fontFamily: "var(--font-dm)", display: "flex", alignItems: "center", gap: 10,
                            }}
                          >
                            {p.images[0] ? (
                              <img src={p.images[0].url} alt={p.name}
                                style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 6, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                                🍽️
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dash-text)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                              <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>${Number(p.basePrice).toFixed(2)}</span>
                            </div>
                            <span style={{ fontSize: 18, color: "var(--dash-orange)", flexShrink: 0 }}>+</span>
                          </button>
                        ))}
                      {categories.flatMap(c => c.products).filter(p =>
                        p.id !== productId &&
                        p.name.toLowerCase().includes(suggestionSearch.toLowerCase()) &&
                        !suggestions.find(s => s.suggestedProduct.id === p.id)
                      ).length === 0 && (
                        <p style={{ fontSize: 13, color: "var(--dash-muted)", textAlign: "center", padding: "20px 0" }}>
                          {suggestionSearch ? "Sin resultados" : "Todos los productos ya están como sugerencia"}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setShowSuggestionPicker(false)} style={{ marginTop: 14, padding: "10px 0", border: "1px solid var(--dash-border)", borderRadius: 10, background: "none", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Picker de complementos existentes ─── */}
          {showGroupPicker && (
            <div
              onClick={() => setShowGroupPicker(false)}
              style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            >
              <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                <h3 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 16, color: "var(--dash-text)", margin: "0 0 14px" }}>
                  Agregar complemento
                </h3>
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Buscar complemento..."
                  style={{ ...inputStyle, marginBottom: 12 }}
                />
                <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {allGroups
                    .filter(g =>
                      (g.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                       (g.internalName ?? "").toLowerCase().includes(pickerSearch.toLowerCase())) &&
                      !groups.find(ag => ag.id === g.id)
                    )
                    .map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleAssignExisting(g.id)}
                        style={{
                          textAlign: "left", padding: "10px 14px", border: "1px solid var(--dash-border)",
                          borderRadius: 10, background: "var(--dash-canvas)", cursor: "pointer",
                          fontFamily: "var(--font-dm)", display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dash-text)" }}>{g.name}</span>
                          {g.internalName && (
                            <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "#EDE9FE", color: "#5B21B6", fontWeight: 600 }}>
                              {g.internalName}
                            </span>
                          )}
                          <span style={{ display: "block", fontSize: 11, color: "var(--dash-muted)", marginTop: 2 }}>
                            {g.options.length} opcion{g.options.length !== 1 ? "es" : ""}
                          </span>
                        </div>
                        <span style={{ fontSize: 18, color: "var(--dash-orange)" }}>+</span>
                      </button>
                    ))}
                  {allGroups.filter(g => (g.name.toLowerCase().includes(pickerSearch.toLowerCase()) || (g.internalName ?? "").toLowerCase().includes(pickerSearch.toLowerCase())) && !groups.find(ag => ag.id === g.id)).length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--dash-muted)", textAlign: "center", padding: "20px 0" }}>
                      {pickerSearch ? "Sin resultados" : "Todos los complementos ya están asignados"}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowGroupPicker(false)} style={{ marginTop: 14, padding: "10px 0", border: "1px solid var(--dash-border)", borderRadius: 10, background: "none", fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-muted)", cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── GroupEditor ────────────────────────────────────────────────────────────────

interface GroupEditorProps {
  group:               GroupData;
  newOptionName:       string;
  onNewOptionNameChange: (val: string) => void;
  addingOption:        boolean;
  onAddOption:         () => void;
  onDeleteOption:      (optId: string) => void;
  onToggleOption:      (opt: OptionData) => void;
  onDeleteGroup:       () => void;
  onPatchGroup:        (field: "required" | "multiple", value: boolean) => void;
}

function GroupEditor({
  group, newOptionName, onNewOptionNameChange, addingOption,
  onAddOption, onDeleteOption, onToggleOption, onDeleteGroup, onPatchGroup,
}: GroupEditorProps) {
  return (
    <div style={{
      border: "1px solid var(--dash-border)",
      borderRadius: 10, overflow: "hidden",
    }}>
      {/* Cabecera del grupo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
        background: "var(--dash-canvas)",
        borderBottom: "1px solid var(--dash-border)",
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-dm)", fontWeight: 600, fontSize: 13, color: "var(--dash-text)" }}>
            {group.name}
          </span>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)" }}>
          <input
            type="checkbox"
            checked={group.required}
            onChange={e => onPatchGroup("required", e.target.checked)}
            style={{ accentColor: "var(--dash-orange)" }}
          />
          Requerido
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: "var(--font-dm)", fontSize: 11, color: "var(--dash-muted)" }}>
          <input
            type="checkbox"
            checked={group.multiple}
            onChange={e => onPatchGroup("multiple", e.target.checked)}
            style={{ accentColor: "var(--dash-orange)" }}
          />
          Múltiple
        </label>
        <button
          onClick={onDeleteGroup}
          title="Eliminar grupo"
          style={{ ...iconBtnStyle, color: "var(--dash-red)" }}
        >
          <IconTrash size={13} />
        </button>
      </div>

      {/* Opciones */}
      <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {group.options.length === 0 && (
          <p style={{ fontFamily: "var(--font-dm)", fontSize: 12, color: "var(--dash-muted)", margin: "2px 0 4px" }}>
            Sin opciones aún.
          </p>
        )}

        {group.options.map(opt => (
          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-text)", flex: 1 }}>
              {opt.name}
              {parseFloat(opt.price) > 0 && (
                <span style={{ color: "var(--dash-muted)", marginLeft: 6, fontWeight: 400 }}>
                  +{formatPrice(opt.price)}
                </span>
              )}
            </span>
            <ToggleBadge
              label={opt.isAvailable ? "Disponible" : "No disp."}
              active={opt.isAvailable}
              loading={false}
              onClick={() => onToggleOption(opt)}
              colorOff="var(--dash-amber)"
              softOff="var(--dash-amber-soft)"
            />
            <button
              onClick={() => onDeleteOption(opt.id)}
              title="Eliminar opción"
              style={{ ...iconBtnStyle, color: "var(--dash-red)", padding: "4px" }}
            >
              <IconTrash size={12} />
            </button>
          </div>
        ))}

        {/* Agregar opción inline */}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input
            type="text"
            value={newOptionName}
            onChange={e => onNewOptionNameChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), onAddOption())}
            placeholder="Nueva opción…"
            style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", flex: 1 }}
            maxLength={80}
          />
          <button
            type="button"
            onClick={onAddOption}
            disabled={addingOption || !newOptionName.trim()}
            style={{
              ...btnPrimaryStyle(addingOption || !newOptionName.trim()),
              padding: "6px 12px", fontSize: 12,
            }}
          >
            {addingOption ? "…" : "+ Opción"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────

function Modal({ children, onClose, title, wide = false }: {
  children: React.ReactNode;
  onClose:  () => void;
  title:    string;
  wide?:    boolean;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--dash-surface)", borderRadius: 16,
        width: "100%", maxWidth: wide ? 640 : 440,
        maxHeight: "90dvh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--dash-border)",
          position: "sticky", top: 0, background: "var(--dash-surface)", zIndex: 1,
          borderRadius: "16px 16px 0 0",
        }}>
          <h2 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 16, color: "var(--dash-text)", margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 8,
              border: "1px solid var(--dash-border)", background: "none", cursor: "pointer",
              color: "var(--dash-muted)",
            }}
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────────────────────

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      <label style={{ fontFamily: "var(--font-dm)", fontSize: 12, fontWeight: 600, color: "var(--dash-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: 13, color: "var(--dash-text)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </h3>
  );
}

function ErrorMsg({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontFamily: "var(--font-dm)", fontSize: 13, color: "var(--dash-red)", background: "var(--dash-red-soft)", borderRadius: 8, padding: "8px 12px", margin: 0, ...style }}>
      {children}
    </p>
  );
}

// ── Estilos reutilizables ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm)", fontSize: 14,
  padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-canvas)",
  color: "var(--dash-text)",
  outline: "none", width: "100%",
  boxSizing: "border-box",
};

const iconBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "6px", borderRadius: 8,
  border: "1px solid var(--dash-border)",
  background: "none", cursor: "pointer",
  color: "var(--dash-muted)",
  transition: "all 0.15s", flexShrink: 0,
};

const btnSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 500,
  padding: "9px 18px", borderRadius: 9,
  border: "1px solid var(--dash-border)",
  background: "var(--dash-canvas)", color: "var(--dash-muted)",
  cursor: "pointer",
};

const btnPrimaryStyle = (disabled: boolean): React.CSSProperties => ({
  fontFamily: "var(--font-dm)", fontSize: 13, fontWeight: 600,
  padding: "9px 18px", borderRadius: 9,
  border: "none",
  background: disabled ? "var(--dash-border)" : "var(--dash-orange)",
  color: disabled ? "var(--dash-muted)" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.15s",
});

// ── Íconos ─────────────────────────────────────────────────────────────────────

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3L5 14H2v-3L11 2z" />
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8L13 4" />
    </svg>
  );
}

function IconChevron({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

function IconExternalLink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2H2v12h12V9" />
      <path d="M10 2h4v4" />
      <path d="M14 2L7 9" />
    </svg>
  );
}

function IconImage({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="12" rx="2" />
      <circle cx="5.5" cy="6.5" r="1.5" />
      <path d="M1 11l4-4 3 3 2-2 5 5" />
    </svg>
  );
}

export function IconMenuList({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="3" rx="1" />
      <rect x="1" y="7" width="14" height="3" rx="1" />
      <rect x="1" y="12" width="8"  height="3" rx="1" />
    </svg>
  );
}
