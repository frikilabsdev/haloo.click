# Project Context

This document is the mandatory pre-change reference for this repository.

Related docs:

- `docs/architecture.md`
- `docs/database.md`
- `docs/flows.md`

## 1. Purpose

`mirestaurante` is a multi-tenant online ordering platform for restaurants.

Business goals:

- Let restaurants publish menu pages quickly.
- Enable customers to place and track orders.
- Provide tenant operations dashboard.
- Provide super-admin control over tenant lifecycle and locations.

## 2. Technical stack

- Next.js App Router + React 19 + TypeScript.
- NextAuth v5 credentials auth.
- Prisma + PostgreSQL.
- Zod validation.
- Zustand cart store.
- Cloudinary (images), Resend (emails), OSM/Nominatim (maps).

## 3. Main modules

1. Authentication/session
2. Tenant isolation and access control
3. Public menu and checkout
4. Order creation and tracking
5. Tenant dashboard (menu/orders/settings)
6. Super-admin panel (tenants/locations)

## 4. Project conventions

- Keep tenant isolation enforced in API routes.
- Validate request payloads with Zod where possible.
- Keep pricing and order integrity server-side.
- Keep public order tracking based on tracking token flow.
- Keep API changes backward-compatible unless explicitly planned.
- Avoid exposing secrets in docs/logs/code.

## 5. Critical non-breakable areas

1. Auth guards and role checks.
2. Tenant access checks (`assertTenantAccess` pattern).
3. Checkout -> order creation -> tracking token contract.
4. Prisma schema and migration consistency.
5. Dashboard order status transitions.

## 6. Rules for future modifications (mandatory)

Before implementing any change:

1. Identify impacted modules and API contracts.
2. Evaluate DB impact (schema, migration, data compatibility).
3. Verify security impact (authz, CSRF/origin, data exposure).
4. Explain cross-module effects if touching multiple areas.
5. Validate critical user flows after change.

Do not implement broad multi-module changes without explicit impact explanation.

## 7. Required response format for future change requests

For each requested change, provide this order before coding:

1. Which system area is affected.
2. Which files will change.
3. Main risks of the change.
4. Proposed implementation approach.

Only after this is confirmed should implementation begin.

## 8. Operational status notes

- Lint currently reports existing errors/warnings in repository state.
- There are known schema/migration drift risks that require discipline on DB changes.
- README is generic and not a reliable architecture reference.

Use this document and `/docs/*` as source of truth for engineering decisions.
