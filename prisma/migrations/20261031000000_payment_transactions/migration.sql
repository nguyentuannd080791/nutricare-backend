-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "order_code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gateway" TEXT NOT NULL DEFAULT 'SEPAY',
    "transfer_content" TEXT NOT NULL,
    "sepay_transaction_id" INTEGER,
    "reference_code" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "transaction_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_order_code_key" ON "payment_transactions"("order_code");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_code_idx" ON "payment_transactions"("order_code");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

