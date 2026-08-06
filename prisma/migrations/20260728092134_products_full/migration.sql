/*
  Warnings:

  - Added the required column `productType` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizes` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "hover" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "reviews" INTEGER NOT NULL,
    "badge" TEXT,
    "colors" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "bestseller" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("badge", "colors", "createdAt", "hover", "id", "image", "price", "rating", "reviews", "title") SELECT "badge", "colors", "createdAt", "hover", "id", "image", "price", "rating", "reviews", "title" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
