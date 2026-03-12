-- ── State ──────────────────────────────────────────────────────────────────────
CREATE TABLE "State" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "State_name_key" ON "State"("name");
CREATE UNIQUE INDEX "State_slug_key" ON "State"("slug");

-- ── City ───────────────────────────────────────────────────────────────────────
CREATE TABLE "City" (
    "id"        TEXT NOT NULL,
    "stateId"   TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "City_stateId_slug_key" ON "City"("stateId", "slug");
CREATE INDEX "City_stateId_idx" ON "City"("stateId");
ALTER TABLE "City" ADD CONSTRAINT "City_stateId_fkey"
    FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PasswordResetToken ─────────────────────────────────────────────────────────
CREATE TABLE "PasswordResetToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Tenant: agregar cityId, stateId, deliveryEnabled, pickupEnabled ────────────
ALTER TABLE "Tenant"
    ADD COLUMN "cityId"          TEXT,
    ADD COLUMN "stateId"         TEXT,
    ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "pickupEnabled"   BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_cityId_fkey"
    FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_stateId_fkey"
    FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Order: agregar trackingToken ───────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "trackingToken" TEXT;

-- Generar trackingToken único para pedidos existentes
UPDATE "Order" SET "trackingToken" = gen_random_uuid()::TEXT WHERE "trackingToken" IS NULL;

-- Ahora hacerlo NOT NULL y único
ALTER TABLE "Order" ALTER COLUMN "trackingToken" SET NOT NULL;
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");
