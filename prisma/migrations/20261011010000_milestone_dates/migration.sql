-- Los hitos pasan de "días desde un lunes" a fechas reales (la tabla está vacía: se eliminaron los datos de demostración).
ALTER TABLE "Milestone" DROP COLUMN "start", ADD COLUMN "startDate" DATE NOT NULL;
