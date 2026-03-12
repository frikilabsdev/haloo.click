# Database

## 1. Engine and access

- **Engine**: PostgreSQL.
- **ORM**: Prisma (`@prisma/client` + `@prisma/adapter-pg`).
- **Primary schema**: `prisma/schema.prisma`.
- **Migrations**: `prisma/migrations/*`.

Connection behavior:

- Runtime uses `DATABASE_URL_UNPOOLED` when available, fallback to `DATABASE_URL`.
- Prisma client is created in `src/lib/prisma.ts`.

## 2. Data domains

### 2.1 Identity

- `User`
- `PasswordResetToken`

### 2.2 Tenant and organization

- `Tenant`
- `TenantUser`
- `Branch`
- `State`
- `City`

### 2.3 Catalog/menu

- `Category`
- `Product`
- `ProductImage`
- `ProductVariant`
- `OptionGroup`
- `Option`
- `ProductComplement` (bridge)
- `ProductSuggestion` (bridge)

### 2.4 Operations

- `Schedule`
- `PaymentConfig`
- `DeliveryZone`
- `Order`
- `OrderItem`

## 3. Core relationships

- `Tenant` 1:N `Category`, `Product`, `Order`, `Schedule`, `DeliveryZone`, `Branch`.
- `Tenant` 1:1 `PaymentConfig`.
- `User` N:M `Tenant` through `TenantUser`.
- `Product` 1:N `ProductImage`, `ProductVariant`, `OrderItem`.
- `Product` N:M `OptionGroup` through `ProductComplement`.
- `OptionGroup` 1:N `Option`.
- `Product` N:M `Product` through `ProductSuggestion`.
- `Order` 1:N `OrderItem`.
- `Order` optional -> `DeliveryZone`.
- `Tenant` optional -> `State` and `City`.

## 4. Important invariants

1. Multi-tenant isolation:
- Data ownership is anchored by `tenantId` in operational entities.

2. Public tracking safety:
- `Order.trackingToken` is unique and used for public tracking URLs.

3. Order pricing:
- Order totals must be computed server-side from DB data, not trusted from client payload.

4. Option semantics:
- `OptionGroup.isVariant` drives replacement vs additive pricing behavior.

5. Status transitions:
- Order status transitions are constrained in API logic.

## 5. Indexes and constraints (selected)

- Unique: `Tenant.slug`, `User.email`, `Order.trackingToken`.
- Unique composite: `TenantUser(tenantId,userId)`, `Order(tenantId,orderNumber)`.
- FK-heavy schema with cascade deletes in catalog and order subgraphs.
- Additional indexes on lookup dimensions (`tenantId`, `status`, bridge tables).

## 6. Migration status and risks

Observed from repository state:

- Migrations exist and are actively evolving.
- There is historical evidence of schema/migration drift around some fields (notably option variant modeling).
- `prisma.config.ts` exists locally but is not tracked in git, while datasource URL is not in schema file itself.

Recommendation:

- Treat schema + migrations as one unit.
- Validate every model change on a clean database before merge.

## 7. Seed data

- `prisma/seed.ts`: demo tacos tenant dataset.
- `prisma/seed-pizza.ts`: demo pizza tenant dataset.

Both are local/dev-oriented and include users, tenant data, menu, and delivery settings.

## 8. DB change protocol (mandatory)

Before a DB change:

1. Define business reason and impacted flows.
2. Update `schema.prisma`.
3. Create migration and review SQL.
4. Verify compatibility with existing API contracts.
5. Validate with representative data or seed.
6. Document side effects in `docs/project_context.md` if architecture contracts changed.
