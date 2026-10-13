-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN "lang" TEXT NOT NULL DEFAULT 'es';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "notifyClient" BOOLEAN NOT NULL DEFAULT true;
