-- CreateTable
CREATE TABLE "ExtractionLog" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "files" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractionLog_ipHash_createdAt_idx" ON "ExtractionLog"("ipHash", "createdAt");
