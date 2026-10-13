-- AlterTable: un contacto que guardó su cálculo puede no tener teléfono (solo correo)
ALTER TABLE "Lead" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'es',
    "source" TEXT NOT NULL DEFAULT 'simulator',
    "state" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "email" TEXT,
    "emailConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Simulation_tokenHash_key" ON "Simulation"("tokenHash");

-- CreateIndex
CREATE INDEX "Simulation_expiresAt_idx" ON "Simulation"("expiresAt");
