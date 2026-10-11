-- AlterTable
ALTER TABLE "Project" ADD COLUMN "quoteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_quoteId_key" ON "Project"("quoteId");
