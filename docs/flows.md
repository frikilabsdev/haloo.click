# Flows

## 1. Onboarding and access flow

### 1.1 Restaurant registration

1. User opens `/register`.
2. Frontend submits to `POST /api/auth/register`.
3. Backend creates:
- `User`
- `Tenant` with initial `PENDING` status
- `TenantUser` with `OWNER` role
- `PaymentConfig` defaults
4. User signs in using credentials.
5. Middleware redirects pending tenant users to `/pendiente`.

### 1.2 Tenant activation

1. Super-admin opens `/admin/tenants`.
2. Updates tenant status via `PATCH /api/admin/tenants/[id]`.
3. Tenant can then access `/dashboard`.

## 2. Public menu and cart flow

1. Client opens `/{slug}`.
2. Server loads tenant + active categories/products/options.
3. Client component renders menu and manages cart with Zustand store.
4. Cart is tenant-scoped (switching tenant clears cart).

## 3. Checkout and order creation flow

1. Client opens `/{slug}/checkout`.
2. Loads tenant delivery/payment/schedule context.
3. Client submits checkout payload to `POST /api/orders`.
4. Backend validates:
- tenant availability/status
- open schedule window
- product availability
- option validity
5. Backend recalculates prices from DB.
6. Backend creates `Order` + `OrderItem` in transaction.
7. Response returns `orderNumber` and `trackingToken`.
8. Client stores last order token and redirects to tracking page.

## 4. Public order tracking flow

1. Client opens `/{slug}/pedido/{orderId}` (where `orderId` is tracking token).
2. Page polls `GET /api/public/orders/[orderId]`.
3. UI updates status timeline until terminal status (`DELIVERED` or `CANCELLED`).

## 5. Dashboard operations flow (tenant)

### 5.1 Orders board

1. Dashboard loads latest orders.
2. Client polls `GET /api/orders`.
3. Staff updates status via `PATCH /api/orders/[id]`.
4. Backend enforces allowed status transitions.

### 5.2 Menu management

1. Tenant edits categories/products/options/variants/complements.
2. UI calls `/api/menu/*`.
3. API validates session and tenant access.
4. DB updates catalog entities and relations.

### 5.3 Tenant settings

1. Tenant updates profile/schedules/payment/zones.
2. UI calls `/api/settings/*`.
3. API validates tenant access and applies updates.

## 6. Super-admin operations flow

### 6.1 Tenant governance

- List tenants: `GET /api/admin/tenants`.
- Update plan/status: `PATCH /api/admin/tenants/[id]`.
- Hard delete tenant: `DELETE /api/admin/tenants/[id]`.

### 6.2 Locations catalog

- States CRUD: `/api/admin/locations/states*`.
- Cities CRUD: `/api/admin/locations/cities*`.
- Public read-only locations endpoint: `GET /api/locations`.

## 7. Security and failure paths

- Unauthorized tenant/admin requests return 401/403.
- Rate limits protect sensitive/public endpoints.
- Origin checks protect selected mutating routes.
- Tracking endpoint uses tokenized identifier and returns 404 for unknown tokens.

## 8. Critical flows that must not break

1. Register -> pending -> admin approval -> dashboard access.
2. Menu -> cart -> checkout -> order create -> tracking token redirect.
3. Dashboard order status transitions.
4. Tenant isolation in all mutating APIs.
