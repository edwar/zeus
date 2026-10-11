-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('panel', 'inverter_ongrid', 'inverter_hybrid', 'battery', 'structure', 'other');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "capacityWh" INTEGER,
ADD COLUMN     "kind" "ProductKind" NOT NULL DEFAULT 'other',
ADD COLUMN     "packQty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "phases" INTEGER,
ADD COLUMN     "powerW" INTEGER,
ADD COLUMN     "voltageV" INTEGER;

-- CreateIndex
CREATE INDEX "Product_kind_idx" ON "Product"("kind");
