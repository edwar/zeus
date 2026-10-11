-- AlterTable
ALTER TABLE "Alert" ADD COLUMN "createdBy" TEXT, ADD COLUMN "resolvedAt" TIMESTAMP(3), ADD COLUMN "resolvedBy" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "monitorNote" TEXT, ADD COLUMN "monitorUrl" TEXT;
