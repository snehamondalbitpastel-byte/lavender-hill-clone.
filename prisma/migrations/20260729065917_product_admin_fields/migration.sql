-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "productType" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "compareAtPrice" TEXT,
    "image" TEXT NOT NULL,
    "hover" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "badge" TEXT,
    "colors" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "colourData" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "bestseller" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("badge", "bestseller", "colors", "createdAt", "hover", "id", "image", "price", "productType", "rating", "reviews", "sizes", "slug", "title") SELECT "badge", "bestseller", "colors", "createdAt", "hover", "id", "image", "price", "productType", "rating", "reviews", "sizes", "slug", "title" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
