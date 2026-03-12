-- Columnas faltantes detectadas via drift entre migraciones y Neon

-- OptionGroup.isVariant (debió crearse en 20260309092708 pero no existe)
ALTER TABLE "OptionGroup" ADD COLUMN IF NOT EXISTS "isVariant" BOOLEAN NOT NULL DEFAULT false;

-- Verificar si hay más columnas faltantes en otros modelos
-- Order.trackingToken ya fue agregado en 20260312000000
-- Tenant.deliveryEnabled / pickupEnabled ya fueron agregados en 20260312000000
