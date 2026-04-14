-- CreateEnum
CREATE TYPE "IotSource" AS ENUM ('rfid', 'sensor', 'qr_scan', 'webhook', 'manual');

-- CreateEnum
CREATE TYPE "ReorderStatus" AS ENUM ('pending', 'ordered', 'dismissed');

-- CreateTable
CREATE TABLE "warehouse_zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_events" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "source" "IotSource" NOT NULL,
    "event_type" TEXT NOT NULL,
    "message" TEXT,
    "quantity_delta" DECIMAL(12,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iot_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_suggestions" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "suggested_qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReorderStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reorder_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_zones_code_key" ON "warehouse_zones"("code");

-- CreateIndex
CREATE INDEX "iot_events_item_id_occurred_at_idx" ON "iot_events"("item_id", "occurred_at");

-- CreateIndex
CREATE INDEX "reorder_suggestions_status_idx" ON "reorder_suggestions"("status");

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "zone_id" TEXT,
ADD COLUMN     "bin_code" TEXT;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_events" ADD CONSTRAINT "iot_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_suggestions" ADD CONSTRAINT "reorder_suggestions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
