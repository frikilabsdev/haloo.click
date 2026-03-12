/**
 * Rate limiter de ventana deslizante en memoria.
 * Para producción multi-instancia, reemplazar con Redis (Upstash).
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Limpiar entradas expiradas cada 10 minutos para evitar memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key      Identificador único (IP + ruta, email, etc.)
 * @param limit    Máximo de solicitudes permitidas
 * @param windowMs Ventana de tiempo en milisegundos
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrae la IP real del cliente.
 * Funciona detrás de proxies/CDN que envían X-Forwarded-For.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
