import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
}

/**
 * Alias visual para la migración de "complementos" a "personalizaciones".
 * No modifica datos ni contratos API; solo texto mostrado en UI.
 */
export function normalizeCustomizationLabel(text: string): string {
  return text
    .replace(/\bComplementos\b/g, "Personalizaciones")
    .replace(/\bcomplementos\b/g, "personalizaciones")
    .replace(/\bComplemento\b/g, "Personalización")
    .replace(/\bcomplemento\b/g, "personalización");
}

/**
 * Convierte cualquier texto en un slug válido para URL.
 * Reglas: solo a-z, 0-9 y guión. Sin espacios, puntos, acentos,
 * caracteres especiales, guiones dobles ni guiones al inicio/fin.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")                        // descomponer acentos (á → a + ́)
    .replace(/[\u0300-\u036f]/g, "")         // eliminar marcas diacríticas
    .replace(/[ñ]/g, "n")                    // ñ → n (ya sin tilde tras NFD)
    .replace(/[^a-z0-9\s]/g, " ")            // reemplazar todo lo que no sea letra/número por espacio
    .replace(/\s+/g, "-")                    // espacios → guión
    .replace(/-{2,}/g, "-")                  // guiones dobles → uno solo
    .replace(/^-+|-+$/g, "");               // quitar guiones al inicio y al final
}

/**
 * Valida que un slug ya generado sea seguro para guardar en DB.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 2 && slug.length <= 60;
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  // Web Crypto API (disponible en Node.js 15+ y browser) — evita colisiones en alta concurrencia
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const random = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${timestamp}-${random}`;
}
