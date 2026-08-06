-- CreateTable
CREATE TABLE "CollectionPage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "breadcrumbs" TEXT NOT NULL,
    "links" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPage_slug_key" ON "CollectionPage"("slug");
