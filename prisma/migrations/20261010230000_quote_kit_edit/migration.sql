-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "originalItems" JSONB, ADD COLUMN "originalTotal" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "QuoteEvent" ADD COLUMN "kitChange" BOOLEAN NOT NULL DEFAULT false;
