# PROJECT_CONTEXT

Documento de referencia arquitectónica del proyecto `mirestaurante`.
Este archivo es **obligatorio** de consultar antes de proponer o ejecutar cambios de código.

## 1. Descripción del sistema

`mirestaurante` es una plataforma multi-tenant para restaurantes que permite:

- Registro y gestión de restaurantes.
- Menú público por `slug` (cliente final).
- Flujo de carrito, checkout y creación de pedidos.
- Tracking público de pedidos mediante `trackingToken`.
- Dashboard del restaurante para operar menú, pedidos y configuración.
- Panel super-admin para gestionar tenants y catálogo de ubicaciones (estados/ciudades).

El dominio principal es: **tenants + catálogo + pedidos**.

## 2. Arquitectura

Arquitectura actual: **monolito Next.js (App Router) con BFF interno**.

- **Frontend**: Server Components + Client Components en `src/app/**`.
- **Backend HTTP**: Route Handlers en `src/app/api/**`.
- **Persistencia**: Prisma ORM + PostgreSQL.
- **Auth**: NextAuth v5 con credentials (JWT session strategy).
- **Autorización**:
  - Super-admin: `isAdmin`.
  - Operación de restaurante: validación de pertenencia a tenant (`assertTenantAccess`).
- **Middleware**: guardas de acceso y headers de seguridad en `src/proxy.ts`.

Capas lógicas:

1. Presentación (páginas y componentes)
2. Endpoints API (validación + orquestación de negocio)
3. Servicios/utilidades de dominio (`src/lib`)
4. Datos (Prisma + PostgreSQL)

## 3. Estructura del repositorio

Rutas clave:

- `src/app/`
  - `(public)/[slug]`: menú público, checkout, tracking.
  - `(auth)`: login, registro, recuperación de contraseña.
  - `dashboard`: panel del tenant.
  - `(admin)/admin`: panel super-admin.
  - `api`: endpoints backend.
- `src/lib/`
  - `prisma.ts`, `tenant.ts`, `session.ts`, `env.ts`, `csrf.ts`, `ratelimit.ts`, `whatsapp.ts`, `utils.ts`.
- `src/types/`: tipos compartidos y extensiones de NextAuth.
- `prisma/`
  - `schema.prisma`, `migrations/`, `seed.ts`, `seed-pizza.ts`.
- `public/`: assets estáticos.

Observaciones:

- Existen carpetas de tooling interno (`.agents`, `.claude`, `skills`) fuera del runtime principal.
- Hay rutas API vacías (`src/app/api/products`, `src/app/api/tenants`, `src/app/api/upload`).

## 4. Flujo principal

Flujo principal de negocio:

1. Registro restaurante:
   - UI auth -> `POST /api/auth/register`
   - Crea `User`, `Tenant`, `TenantUser (OWNER)` y `PaymentConfig`.
2. Acceso menú público:
   - `/{slug}` carga tenant activo + categorías/productos.
3. Carrito/checkout:
   - Estado local con Zustand (`cart-store`).
   - Checkout envía `POST /api/orders`.
4. Creación de pedido:
   - Backend valida tenant/horario/disponibilidad.
   - Recalcula montos usando DB.
   - Persiste `Order` + `OrderItem`.
   - Retorna `trackingToken`.
5. Tracking:
   - Cliente consulta `GET /api/public/orders/[orderId]` (token de tracking).
6. Operación dashboard:
   - Gestión de menú (`/api/menu/*`), configuración (`/api/settings/*`) y estados de pedido (`/api/orders/[id]`).

## 5. Dependencias

Dependencias técnicas clave (`package.json`):

- Core:
  - `next`, `react`, `react-dom`, `typescript`.
- Auth/seguridad:
  - `next-auth`, `bcryptjs`, `zod`.
- Datos:
  - `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`.
- UI:
  - `@radix-ui/*`, `lucide-react`.
- Estado/Forms:
  - `zustand`, `react-hook-form`, `@hookform/resolvers`.
- Geolocalización:
  - `leaflet`, `react-leaflet`.
- Servicios externos:
  - `cloudinary` (uploads), Resend vía `fetch` HTTP (email).

Variables de entorno relevantes:

- Base: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`.
- Auth: `AUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL`.
- Media: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Operación: `ADMIN_WHATSAPP`.
- Password reset/email: `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM`.

## 6. Convenciones del proyecto

Convenciones actuales observadas:

- Código en TypeScript estricto (`strict: true`).
- Validación de payloads con Zod en la mayoría de endpoints.
- Serialización de `Prisma.Decimal` mediante `JSON.parse(JSON.stringify(...))` antes de pasar a client components.
- Diseño UI mayormente con estilos inline + variables CSS globales.
- Mensajes y textos en español.
- Patrón de seguridad:
  - `auth()` para sesión.
  - `assertTenantAccess()` para aislamiento tenant.
  - `requireAdminApi()` para endpoints de super-admin.
- `trackingToken` como identificador público de pedido.

Limitaciones/convenios a considerar:

- `README.md` está genérico y no documenta arquitectura real.
- Existe código legado de Supabase comentado (no activo).
- El lint actual no está en estado limpio (hay errores y warnings).

## 7. Reglas para futuras modificaciones

Estas reglas son obligatorias antes de implementar cambios:

1. **Analizar impacto transversal**:
   - UI, API, auth, DB, migraciones y flujos de tracking/checkout.
2. **Mantener aislamiento multi-tenant**:
   - Toda mutación/lectura sensible debe validar pertenencia al tenant.
3. **No romper contratos de API existentes**:
   - Especial atención a `orders -> trackingToken`.
4. **Preservar integridad de precios/pedidos**:
   - Nunca confiar en precios del cliente.
5. **Revisar consistencia Prisma**:
   - Cualquier cambio de modelo requiere revisión de migraciones y drift.
6. **Aplicar cambios acotados y explicados**:
   - Si se tocan múltiples módulos, justificar secuencia e impacto.
7. **Seguridad primero**:
   - Revisar CSRF/origen, auth, autorización y exposición pública de datos.
8. **Verificación mínima**:
   - Ejecutar al menos lint/tests relevantes del área tocada.
9. **No tocar secretos**:
   - No exponer valores de `.env` en commits ni documentación.
10. **Documentar decisiones arquitectónicas**:
    - Si cambia un contrato o patrón base, actualizar este archivo.

---

## Protocolo de uso (obligatorio)

Antes de cada cambio, responder internamente este checklist:

1. ¿Qué módulo(s) afecta?
2. ¿Qué contrato/API/campos cambia?
3. ¿Qué riesgo introduce?
4. ¿Cómo se valida que no rompe flujos críticos?

Si no se puede responder claramente, **no implementar** hasta aclarar diseño.
