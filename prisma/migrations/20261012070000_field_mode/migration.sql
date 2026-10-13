-- CreateTable
CREATE TABLE "InstallCheck" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneBy" TEXT,
    "note" TEXT,
    "clientAt" TIMESTAMP(3),

    CONSTRAINT "InstallCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "checkKey" TEXT,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "data" BYTEA,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "projectId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "notes" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("projectId")
);

-- CreateIndex
CREATE INDEX "InstallCheck_projectId_idx" ON "InstallCheck"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallCheck_projectId_key_key" ON "InstallCheck"("projectId", "key");

-- CreateIndex
CREATE INDEX "ProjectPhoto_projectId_createdAt_idx" ON "ProjectPhoto"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "InstallCheck" ADD CONSTRAINT "InstallCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
