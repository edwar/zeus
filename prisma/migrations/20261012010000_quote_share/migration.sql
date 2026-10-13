-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "shareTokenHash" TEXT,
ADD COLUMN "shareExpiresAt" TIMESTAMP(3),
ADD COLUMN "clientDecision" TEXT,
ADD COLUMN "clientDecidedAt" TIMESTAMP(3),
ADD COLUMN "clientDecisionNote" TEXT,
ADD COLUMN "clientDecisionTotal" DECIMAL(14,2);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_shareTokenHash_key" ON "QuoteRequest"("shareTokenHash");
