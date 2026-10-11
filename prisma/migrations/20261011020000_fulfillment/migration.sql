-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "fulfillment" TEXT NOT NULL DEFAULT 'unknown', ADD COLUMN "distanceKm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "QuoteEvent" ADD COLUMN "subject" TEXT;
