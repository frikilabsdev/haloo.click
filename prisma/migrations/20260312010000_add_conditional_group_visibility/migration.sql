-- Visibilidad condicional de grupos de opciones (columna ya existente via db push)
ALTER TABLE "OptionGroup" ADD COLUMN IF NOT EXISTS "showIfOptionId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OptionGroup_showIfOptionId_fkey'
  ) THEN
    ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_showIfOptionId_fkey"
      FOREIGN KEY ("showIfOptionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
