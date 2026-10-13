-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audience" TEXT NOT NULL DEFAULT 'home',
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "summaryEs" TEXT NOT NULL DEFAULT '',
    "summaryEn" TEXT NOT NULL DEFAULT '',
    "quoteEs" TEXT,
    "quoteEn" TEXT,
    "displayName" TEXT NOT NULL DEFAULT '',
    "town" TEXT NOT NULL DEFAULT '',
    "department" TEXT,
    "kwp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "systemType" TEXT NOT NULL DEFAULT 'ongrid',
    "installedOn" DATE,
    "billBefore" INTEGER NOT NULL DEFAULT 0,
    "billAfter" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "evidence" TEXT NOT NULL DEFAULT '',
    "verifiedOn" DATE,
    "verifiedBy" TEXT,
    "consentAt" TIMESTAMP(3),
    "consentBy" TEXT,
    "consentNote" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");

-- CreateIndex
CREATE INDEX "CaseStudy_status_publishedAt_idx" ON "CaseStudy"("status", "publishedAt");
