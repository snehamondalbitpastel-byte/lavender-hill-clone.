-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Return" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnNumber" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT NOT NULL DEFAULT '',
    "items" TEXT NOT NULL DEFAULT '[]',
    "images" TEXT NOT NULL DEFAULT '[]',
    "refundAmount" REAL NOT NULL DEFAULT 0,
    "refundRef" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "returnCarrier" TEXT NOT NULL DEFAULT '',
    "returnTrackingNumber" TEXT NOT NULL DEFAULT '',
    "restockingFee" REAL NOT NULL DEFAULT 0,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Return" ("adminNote", "createdAt", "customerId", "id", "items", "orderId", "reason", "refundAmount", "refundRef", "returnNumber", "status", "updatedAt") SELECT "adminNote", "createdAt", "customerId", "id", "items", "orderId", "reason", "refundAmount", "refundRef", "returnNumber", "status", "updatedAt" FROM "Return";
DROP TABLE "Return";
ALTER TABLE "new_Return" RENAME TO "Return";
CREATE UNIQUE INDEX "Return_returnNumber_key" ON "Return"("returnNumber");
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");
CREATE INDEX "Return_customerId_idx" ON "Return"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
