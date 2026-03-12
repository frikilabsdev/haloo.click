# Architecture

## 1. System overview

`mirestaurante` is a multi-tenant SaaS for restaurants built as a Next.js monolith.

Main capabilities:

- Restaurant onboarding and approval flow.
- Public menu by tenant slug.
- Cart, checkout, and order creation.
- Public order tracking via tracking token.
- Tenant dashboard for menu/orders/settings.
- Super-admin panel for tenants and locations catalog.

## 2. Architectural style

- **Pattern**: modular monolith (UI + API + data access in one repo).
- **Frontend**: Next.js App Router (Server Components + Client Components).
- **Backend**: Next.js Route Handlers (`src/app/api/**`) as internal BFF.
- **Data layer**: Prisma ORM over PostgreSQL.
- **Auth**: NextAuth v5 credentials provider (JWT strategy).

## 3. Runtime layers

1. Presentation layer
- `src/app/(public)`, `src/app/(auth)`, `src/app/dashboard`, `src/app/(admin)/admin`.

2. API/application layer
- `src/app/api/**/route.ts`.
- Validation with Zod in most mutating routes.

3. Domain/support services
- `src/lib/*` (auth/session/tenant/csrf/ratelimit/prisma/whatsapp/utils).

4. Persistence
- `prisma/schema.prisma`.
- `prisma/migrations/*`.

## 4. Module map

### 4.1 Identity and access

- `src/auth.ts`: NextAuth config, credential login, token/session callbacks.
- `src/lib/session.ts`: guards (`requireSession`, `requireAdmin`, `requireAdminApi`).
- `src/proxy.ts`: route access policy and security headers.

### 4.2 Tenant context and isolation

- `src/lib/tenant.ts`: tenant resolution and tenant ownership check.
- `assertTenantAccess` is the key isolation primitive for tenant APIs.

### 4.3 Catalog/menu

- API domain: `/api/menu/*`.
- Entities: categories, products, product variants, option groups, options, complements, suggestions.

### 4.4 Orders and checkout

- Public checkout entrypoint: `/{slug}/checkout`.
- API: `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/[id]`.
- Tracking API: `GET /api/public/orders/[orderId]` (tracking token).

### 4.5 Tenant configuration

- API domain: `/api/settings/*`.
- Covers tenant profile, schedules, payment config, delivery zones.

### 4.6 Super-admin

- API domain: `/api/admin/*`.
- Tenants lifecycle and location master data (`State`, `City`).

## 5. Security model

Authentication:

- Credentials + bcrypt password hash.
- JWT session payload includes tenant and role context.

Authorization:

- Super-admin routes: `requireAdminApi`.
- Tenant routes: session + `assertTenantAccess`.

Additional controls:

- Origin validation for selected mutating routes (`validateOrigin`).
- In-memory rate limiter for sensitive endpoints.
- Public tracking by random `trackingToken` (not numeric sequence).
- Security headers in `src/proxy.ts`.

## 6. External services

- Cloudinary: image uploads.
- Resend: password reset email delivery.
- OpenStreetMap + Nominatim: map tiles and reverse geocoding.
- WhatsApp deep links (`wa.me`) for restaurant handoff.

## 7. Known architecture constraints

- No explicit service layer; business logic is mostly in route handlers.
- In-memory rate limiting is not distributed.
- Prisma migration history shows drift risk and needs strict discipline.
- Lint is not clean as of latest audit run; quality gates are not yet green.

## 8. Change impact guidance

Before implementing any change:

1. Identify affected module(s): public flow, tenant dashboard, admin, auth, API, DB.
2. Verify authz/tenant isolation impact.
3. Check API contract compatibility (especially order tracking token flow).
4. Check schema/migration impact if any model changes.
5. Validate end-to-end critical flows after change.
