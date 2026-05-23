/*
  Warnings:

  - A unique constraint covering the columns `[menu_recommendation_id,menu_date]` on the table `menu_recommendation_days` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `menu_date` to the `menu_recommendation_days` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "menu_recommendation_days" ADD COLUMN     "menu_date" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "menu_recommendation_days_menu_recommendation_id_menu_date_key" ON "menu_recommendation_days"("menu_recommendation_id", "menu_date");
