-- CreateTable
CREATE TABLE "menu_recommendations" (
    "menu_recommendation_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "diet_type" TEXT NOT NULL,
    "target_energy_kcal" DOUBLE PRECISION NOT NULL,
    "target_carbohydrate_g" DOUBLE PRECISION NOT NULL,
    "target_protein_g" DOUBLE PRECISION NOT NULL,
    "target_fat_g" DOUBLE PRECISION NOT NULL,
    "sodium_max_mg" DOUBLE PRECISION,
    "fiber_min_g" DOUBLE PRECISION,
    "total_days" INTEGER NOT NULL DEFAULT 7,
    "generation_status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_recommendations_pkey" PRIMARY KEY ("menu_recommendation_id")
);

-- CreateTable
CREATE TABLE "menu_recommendation_days" (
    "menu_day_id" SERIAL NOT NULL,
    "menu_recommendation_id" INTEGER NOT NULL,
    "day_number" INTEGER NOT NULL,
    "energy_kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "carb_g" DOUBLE PRECISION NOT NULL,
    "sodium_mg" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "menu_recommendation_days_pkey" PRIMARY KEY ("menu_day_id")
);

-- CreateTable
CREATE TABLE "menu_recommendation_items" (
    "menu_item_id" SERIAL NOT NULL,
    "menu_day_id" INTEGER NOT NULL,
    "meal_time" TEXT NOT NULL,
    "food_name" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "portion" DOUBLE PRECISION NOT NULL,
    "urt" TEXT,
    "gram" DOUBLE PRECISION,
    "energy_kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "carb_g" DOUBLE PRECISION NOT NULL,
    "sodium_mg" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "menu_recommendation_items_pkey" PRIMARY KEY ("menu_item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_recommendation_days_menu_recommendation_id_day_number_key" ON "menu_recommendation_days"("menu_recommendation_id", "day_number");

-- AddForeignKey
ALTER TABLE "menu_recommendations" ADD CONSTRAINT "menu_recommendations_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_recommendation_days" ADD CONSTRAINT "menu_recommendation_days_menu_recommendation_id_fkey" FOREIGN KEY ("menu_recommendation_id") REFERENCES "menu_recommendations"("menu_recommendation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_recommendation_items" ADD CONSTRAINT "menu_recommendation_items_menu_day_id_fkey" FOREIGN KEY ("menu_day_id") REFERENCES "menu_recommendation_days"("menu_day_id") ON DELETE CASCADE ON UPDATE CASCADE;
