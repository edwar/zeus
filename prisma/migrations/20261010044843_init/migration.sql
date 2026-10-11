-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('lead', 'visit', 'design', 'install', 'monitor');

-- CreateEnum
CREATE TYPE "KitKind" AS ENUM ('solar', 'automation');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('home', 'business', 'automation');

-- CreateEnum
CREATE TYPE "Crew" AS ENUM ('A', 'B', 'E');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('high', 'mid', 'low');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "kwp" DOUBLE PRECISION NOT NULL,
    "stage" "Stage" NOT NULL,
    "owner" TEXT NOT NULL,
    "due" DATE NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kit" (
    "id" TEXT NOT NULL,
    "kind" "KitKind" NOT NULL,
    "audience" "Audience" NOT NULL,
    "kwp" DOUBLE PRECISION,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "coversEs" TEXT NOT NULL,
    "coversEn" TEXT NOT NULL,
    "includesEs" TEXT[],
    "includesEn" TEXT[],

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "len" INTEGER NOT NULL,
    "crew" "Crew" NOT NULL,
    "done" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "messageEs" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldTask" (
    "id" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "at" TEXT NOT NULL,

    CONSTRAINT "FieldTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Material_projectId_idx" ON "Material"("projectId");

-- CreateIndex
CREATE INDEX "Alert_projectId_idx" ON "Alert"("projectId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
