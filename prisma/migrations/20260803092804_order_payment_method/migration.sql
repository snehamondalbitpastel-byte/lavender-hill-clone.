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
    "paymentBrand" TEXT NOT NULL DEFAULT '',
    "paymentLast4" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Order" ("address1", "address2", "cancelledAt", "city", "company", "country", "createdAt", "currency", "customerId", "deliveredAt", "discount", "discountCode", "email", "firstName", "fulfillmentStatus", "id", "items", "lastName", "note", "orderNumber", "paymentRef", "paymentStatus", "phone", "postcode", "refundedAmount", "shippedAt", "shipping", "state", "status", "subtotal", "total", "trackingCarrier", "trackingNumber") SELECT "address1", "address2", "cancelledAt", "city", "company", "country", "createdAt", "currency", "customerId", "deliveredAt", "discount", "discountCode", "email", "firstName", "fulfillmentStatus", "id", "items", "lastName", "note", "orderNumber", "paymentRef", "paymentStatus", "phone", "postcode", "refundedAmount", "shippedAt", "shipping", "state", "status", "subtotal", "total", "trackingCarrier", "trackingNumber" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
