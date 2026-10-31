CREATE TABLE "exercise_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "kcal" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exercise_logs_user_id_log_date_idx" ON "exercise_logs"("user_id", "log_date");

ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
