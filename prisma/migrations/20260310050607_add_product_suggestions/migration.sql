-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- CreateTable
CREATE TABLE "ProductSuggestion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "suggestedProductId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSuggestion_productId_idx" ON "ProductSuggestion"("productId");

-- CreateIndex
CREATE INDEX "ProductSuggestion_suggestedProductId_idx" ON "ProductSuggestion"("suggestedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSuggestion_productId_suggestedProductId_key" ON "ProductSuggestion"("productId", "suggestedProductId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSuggestion" ADD CONSTRAINT "ProductSuggestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSuggestion" ADD CONSTRAINT "ProductSuggestion_suggestedProductId_fkey" FOREIGN KEY ("suggestedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
