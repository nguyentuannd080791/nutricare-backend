-- Nhật ký bữa ăn đã ăn (đồng bộ từ client, server đối chiếu với thực đơn).
CREATE TABLE "meal_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "dish_ids" JSONB NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meal_logs_user_id_log_date_meal_slot_key" ON "meal_logs"("user_id", "log_date", "meal_slot");
CREATE INDEX "meal_logs_log_date_idx" ON "meal_logs"("log_date");

ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
