/*
  Warnings:

  - You are about to drop the column `phone` on the `clients` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `anthropometry_assessments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "anthropometry_assessments" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "phone";

-- CreateTable
CREATE TABLE "energy_requirements" (
    "energy_requirement_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "daily_energy_kcal" DOUBLE PRECISION NOT NULL,
    "carbohydrate_gram" DOUBLE PRECISION NOT NULL,
    "fat_gram" DOUBLE PRECISION NOT NULL,
    "protein_gram" DOUBLE PRECISION NOT NULL,
    "formula_used" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_requirements_pkey" PRIMARY KEY ("energy_requirement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "energy_requirements_screening_id_key" ON "energy_requirements"("screening_id");

-- AddForeignKey
ALTER TABLE "energy_requirements" ADD CONSTRAINT "energy_requirements_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;
