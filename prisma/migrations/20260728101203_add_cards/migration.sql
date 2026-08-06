-- CreateTable
CREATE TABLE "Card" (
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
    "colors" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "bestseller" BOOLEAN NOT NULL DEFAULT false
);
