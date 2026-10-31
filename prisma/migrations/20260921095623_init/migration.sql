-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "ai_plan_count" INTEGER NOT NULL DEFAULT 0,
    "scan_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_conditions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bmi_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "height_cm" DOUBLE PRECISION NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bmi_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_targets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bmi_record_id" TEXT,
    "goal_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "bmr" INTEGER NOT NULL,
    "tdee" INTEGER NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "carb" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "fiber" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "last_trigger_date" TIMESTAMP(3) NOT NULL,
    "last_trigger_weight" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_groups" (
    "id" INTEGER NOT NULL,
    "name_vi" TEXT NOT NULL,
    "name_en" TEXT,

    CONSTRAINT "dish_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,
    "name_vi" TEXT NOT NULL,
    "name_en" TEXT,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION,
    "fat_g" DOUBLE PRECISION,
    "carb_g" DOUBLE PRECISION,
    "fiber_g" DOUBLE PRECISION,
    "sodium_mg" DOUBLE PRECISION,
    "salt_g" DOUBLE PRECISION,
    "cholesterol_mg" DOUBLE PRECISION,
    "calcium_mg" DOUBLE PRECISION,
    "iron_mg" DOUBLE PRECISION,
    "zinc_mg" DOUBLE PRECISION,
    "magnesium_mg" DOUBLE PRECISION,
    "potassium_mg" DOUBLE PRECISION,
    "vitamin_a_mcg" DOUBLE PRECISION,
    "vitamin_c_mg" DOUBLE PRECISION,
    "betacaroten_mcg" DOUBLE PRECISION,
    "transfat_mg" DOUBLE PRECISION,
    "mufa_pufa_g" DOUBLE PRECISION,
    "source_url" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "search_aliases" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_food_groups" (
    "id" INTEGER NOT NULL,
    "name_vi" TEXT NOT NULL,

    CONSTRAINT "raw_food_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_nutrients" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name_vi" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "raw_nutrients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_foods" (
    "id" INTEGER NOT NULL,
    "name_vi" TEXT NOT NULL,
    "name_en" TEXT,
    "group_id" INTEGER NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "search_aliases" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "raw_foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_food_nutrients" (
    "id" SERIAL NOT NULL,
    "food_id" INTEGER NOT NULL,
    "nutrient_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "raw_food_nutrients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "days" JSONB NOT NULL,
    "calories_at_creation" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "health_conditions_user_id_idx" ON "health_conditions"("user_id");

-- CreateIndex
CREATE INDEX "bmi_records_user_id_idx" ON "bmi_records"("user_id");

-- CreateIndex
CREATE INDEX "nutrition_targets_user_id_idx" ON "nutrition_targets"("user_id");

-- CreateIndex
CREATE INDEX "dishes_group_id_idx" ON "dishes"("group_id");

-- CreateIndex
CREATE INDEX "dishes_name_vi_idx" ON "dishes"("name_vi");

-- CreateIndex
CREATE UNIQUE INDEX "raw_nutrients_code_key" ON "raw_nutrients"("code");

-- CreateIndex
CREATE INDEX "raw_foods_group_id_idx" ON "raw_foods"("group_id");

-- CreateIndex
CREATE INDEX "raw_foods_name_vi_idx" ON "raw_foods"("name_vi");

-- CreateIndex
CREATE INDEX "raw_food_nutrients_food_id_idx" ON "raw_food_nutrients"("food_id");

-- CreateIndex
CREATE UNIQUE INDEX "raw_food_nutrients_food_id_nutrient_id_key" ON "raw_food_nutrients"("food_id", "nutrient_id");

-- CreateIndex
CREATE INDEX "meal_plans_user_id_idx" ON "meal_plans"("user_id");

-- AddForeignKey
ALTER TABLE "health_conditions" ADD CONSTRAINT "health_conditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bmi_records" ADD CONSTRAINT "bmi_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_bmi_record_id_fkey" FOREIGN KEY ("bmi_record_id") REFERENCES "bmi_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "dish_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_foods" ADD CONSTRAINT "raw_foods_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "raw_food_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_food_nutrients" ADD CONSTRAINT "raw_food_nutrients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "raw_foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_food_nutrients" ADD CONSTRAINT "raw_food_nutrients_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "raw_nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
