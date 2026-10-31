CREATE TABLE "water_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "cups" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "water_logs_user_id_log_date_key" ON "water_logs"("user_id", "log_date");

ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
