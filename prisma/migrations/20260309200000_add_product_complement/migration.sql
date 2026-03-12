-- ─── Crear tabla ProductComplement ─────────────────────────────────────────
CREATE TABLE "ProductComplement" (
    "id"            TEXT NOT NULL,
    "productId"     TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "position"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductComplement_pkey" PRIMARY KEY ("id")
);

-- ─── Migrar datos existentes de OptionGroup.productId → ProductComplement ───
INSERT INTO "ProductComplement" ("id", "productId", "optionGroupId", "position", "createdAt")
SELECT
    gen_random_uuid()::text,
    "productId",
    "id",
    "position",
    NOW()
FROM "OptionGroup"
WHERE "productId" IS NOT NULL;

-- ─── Índices y constraints ───────────────────────────────────────────────────
CREATE UNIQUE INDEX "ProductComplement_productId_optionGroupId_key"
    ON "ProductComplement"("productId", "optionGroupId");

CREATE INDEX "ProductComplement_productId_idx"
    ON "ProductComplement"("productId");

CREATE INDEX "ProductComplement_optionGroupId_idx"
    ON "ProductComplement"("optionGroupId");

ALTER TABLE "ProductComplement"
    ADD CONSTRAINT "ProductComplement_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductComplement"
    ADD CONSTRAINT "ProductComplement_optionGroupId_fkey"
    FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Eliminar productId de OptionGroup ──────────────────────────────────────
DROP INDEX IF EXISTS "OptionGroup_productId_idx";

ALTER TABLE "OptionGroup" DROP COLUMN IF EXISTS "productId";
