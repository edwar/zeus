-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductKind" ADD VALUE 'cable_dc';
ALTER TYPE "ProductKind" ADD VALUE 'connector';
ALTER TYPE "ProductKind" ADD VALUE 'terminal';
ALTER TYPE "ProductKind" ADD VALUE 'battery_cable';
ALTER TYPE "ProductKind" ADD VALUE 'cabinet';
ALTER TYPE "ProductKind" ADD VALUE 'rack_tray';
ALTER TYPE "ProductKind" ADD VALUE 'monitoring';
ALTER TYPE "ProductKind" ADD VALUE 'electrical_kit';

