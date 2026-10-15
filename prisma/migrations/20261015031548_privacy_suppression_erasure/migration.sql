-- CreateTable
CREATE TABLE "Suppression" (
    "emailHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suppression_pkey" PRIMARY KEY ("emailHash")
);

-- CreateTable
CREATE TABLE "ErasureLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT NOT NULL,
    "quotes" INTEGER NOT NULL,
    "leads" INTEGER NOT NULL,
    "simulations" INTEGER NOT NULL,
    "projectsKept" INTEGER NOT NULL,
    "emailsBlocked" INTEGER NOT NULL,

    CONSTRAINT "ErasureLog_pkey" PRIMARY KEY ("id")
);
