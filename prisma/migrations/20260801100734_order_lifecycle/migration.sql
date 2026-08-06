-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "actor" TEXT NOT NULL DEFAULT 'system',
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percent',
    "value" REAL NOT NULL,
    "minSubtotal" REAL NOT NULL DEFAULT 0,
    "maxDiscount" REAL,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Return" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnNumber" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT NOT NULL DEFAULT '',
    "items" TEXT NOT NULL DEFAULT '[]',
    "refundAmount" REAL NOT NULL DEFAULT 0,
    "refundRef" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT NOT NULL,
    "customerId" INTEGER,
    "email" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "address1" TEXT NOT NULL DEFAULT '',
    "address2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "postcode" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "items" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "shipping" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "paymentRef" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "paymentStatus" TEXT NOT NULL DEFAULT 'paid',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'unfulfilled',
    "trackingCarrier" TEXT NOT NULL DEFAULT '',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "refundedAmount" REAL NOT NULL DEFAULT 0,
    "discountCode" TEXT NOT NULL DEFAULT '',
    "shippedAt" DATETIME,
    "deliveredAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address1", "address2", "city", "company", "country", "createdAt", "currency", "customerId", "discount", "email", "firstName", "id", "items", "lastName", "note", "orderNumber", "paymentRef", "phone", "postcode", "shipping", "state", "status", "subtotal", "total") SELECT "address1", "address2", "city", "company", "country", "createdAt", "currency", "customerId", "discount", "email", "firstName", "id", "items", "lastName", "note", "orderNumber", "paymentRef", "phone", "postcode", "shipping", "state", "status", "subtotal", "total" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Return_returnNumber_key" ON "Return"("returnNumber");

-- CreateIndex
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");

-- CreateIndex
CREATE INDEX "Return_customerId_idx" ON "Return"("customerId");
