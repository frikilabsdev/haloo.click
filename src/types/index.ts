import type {
  Tenant,
  TenantUser,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  OptionGroup,
  Option,
  ProductComplement,
  ProductSuggestion,
  Order,
  OrderItem,
  DeliveryZone,
  PaymentConfig,
  Schedule,
  Branch,
  State,
  City,
  TenantStatus,
  TenantPlan,
  TenantRole,
  DeliveryType,
  PaymentMethod,
  OrderStatus,
} from "@prisma/client";

// Re-exportar enums
export type {
  TenantStatus,
  TenantPlan,
  TenantRole,
  DeliveryType,
  PaymentMethod,
  OrderStatus,
  ProductComplement,
  ProductSuggestion,
  ProductVariant,
};

// Producto sugerido ("suelen comprarse juntos") — versión mínima para el modal
export interface SuggestedProduct {
  id:          string;
  name:        string;
  basePrice:   string; // Decimal serializado como string
  isActive:    boolean;
  images:      { url: string }[];
  variants:    { id: string; name: string; price: string }[]; // primer variant solo
}

// ─── Tipos enriquecidos (con relaciones) ──────────────────────────────────────

export type TenantWithRelations = Tenant & {
  paymentConfig:   PaymentConfig | null;
  schedules:       Schedule[];
  deliveryZones:   DeliveryZone[];
  branches:        Branch[];
  state:           State | null;
  city:            City  | null;
  // explicit to aid IDE resolution of Prisma generated types
  deliveryEnabled: boolean;
  pickupEnabled:   boolean;
};

export type CategoryWithProducts = Category & {
  products: ProductWithOptions[];
};

// ProductWithOptions mantiene optionGroups[] como interfaz estable.
// Los datos se aplanan desde ProductComplement en el servidor.
export type ProductWithOptions = Product & {
  images:           ProductImage[];
  variants:         ProductVariant[];         // Variantes de precio específicas del producto
  optionGroups:     OptionGroupWithOptions[]; // Extras/complementos de la biblioteca
  suggestions:      SuggestedProduct[];       // Suelen comprarse juntos
  variantGroupName: string | null;            // explicit to aid IDE resolution of Prisma generated types
};

export type OptionGroupWithOptions = OptionGroup & {
  options:   Option[];
  isVariant: boolean; // explicit to aid IDE resolution of Prisma generated types
};

// Complemento con su grupo de opciones completo (para APIs de asignación)
export type ComplementWithGroup = ProductComplement & {
  optionGroup: OptionGroupWithOptions;
};

// Grupo de opciones con lista de productos que lo usan (para biblioteca)
export type OptionGroupWithProducts = OptionGroup & {
  options: Option[];
  complements: (ProductComplement & { product: Pick<Product, "id" | "name"> })[];
};

export type OrderWithItems = Order & {
  items: OrderItemWithProduct[];
  deliveryZone: DeliveryZone | null;
};

export type OrderItemWithProduct = OrderItem & {
  product: Product;
};

// ─── Tipos del carrito (client-side) ─────────────────────────────────────────

export interface SelectedOption {
  optionGroupId: string;
  optionGroupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  id: string; // UUID para identificar el item en el carrito
  productId: string;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
  total: number;
}

// ─── Tipos del formulario de checkout ────────────────────────────────────────

export interface CheckoutFormData {
  customerName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  deliveryType: DeliveryType;
  address?: string;
  addressRef?: string;
  housingType?: string;
  lat?: number;
  lng?: number;
  deliveryZoneId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// ─── Tipos de respuesta de API ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

// ─── Tenant context (resolución en server) ───────────────────────────────────

export interface TenantContext {
  tenant: TenantWithRelations;
  slug: string;
}
