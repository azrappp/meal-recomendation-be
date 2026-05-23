-- AlterTable
ALTER TABLE "menu_recommendation_items" ADD COLUMN     "eaten_at" TIMESTAMP(3),
ADD COLUMN     "is_eaten" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_note" TEXT;
