-- ── 1. Nuevas columnas en Product ────────────────────────────────────────────
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "variantGroupName" TEXT;

-- ── 2. Tabla ProductVariant ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id"          TEXT        NOT NULL,
  "productId"   TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "price"       DECIMAL(10,2) NOT NULL,
  "isAvailable" BOOLEAN     NOT NULL DEFAULT true,
  "position"    INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- ── 3. Migrar grupos isVariant=true → ProductVariant ─────────────────────────
-- 3a. Copiar el nombre del grupo al producto como variantGroupName
UPDATE "Product" p
SET "variantGroupName" = og."name"
FROM "OptionGroup" og
JOIN "ProductComplement" pc ON pc."optionGroupId" = og."id"
WHERE pc."productId" = p."id"
  AND og."isVariant" = true;

-- 3b. Crear ProductVariant desde las opciones de esos grupos
INSERT INTO "ProductVariant" ("id", "productId", "name", "price", "isAvailable", "position")
SELECT
  gen_random_uuid()::text,
  pc."productId",
  o."name",
  o."price",
  o."isAvailable",
  o."position"
FROM "Option" o
JOIN "OptionGroup" og ON og."id" = o."optionGroupId"
JOIN "ProductComplement" pc ON pc."optionGroupId" = og."id"
WHERE og."isVariant" = true;

-- 3c. Eliminar los OptionGroups de tipo variante (cascade borra Options y ProductComplements)
DELETE FROM "OptionGroup" WHERE "isVariant" = true;

-- ── 4. Eliminar columna isVariant de OptionGroup ──────────────────────────────
ALTER TABLE "OptionGroup" DROP COLUMN IF EXISTS "isVariant";
