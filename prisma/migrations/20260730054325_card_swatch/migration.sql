-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "productSlug" TEXT NOT NULL,
    "colour" TEXT,
    "title" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "hover" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "reviews" INTEGER NOT NULL,
    "badge" TEXT,
    "saveBadge" TEXT,
    "swatch" TEXT NOT NULL DEFAULT '',
    "colors" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "bestseller" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Card" ("badge", "bestseller", "colors", "colour", "hover", "id", "image", "order", "price", "productSlug", "productType", "rating", "reviews", "saveBadge", "sizes", "title") SELECT "badge", "bestseller", "colors", "colour", "hover", "id", "image", "order", "price", "productSlug", "productType", "rating", "reviews", "saveBadge", "sizes", "title" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
