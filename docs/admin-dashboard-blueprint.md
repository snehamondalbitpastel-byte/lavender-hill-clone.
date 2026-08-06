# Lavender Hill — Admin Dashboard Blueprint

> A protected control room behind the storefront: add products with their colours
> and prices, arrange the Home / New In / Shop / Sale / About pages, and manage
> orders. This maps a Shopify‑style admin onto our **Next.js App Router + Prisma**
> stack.

**Stack:** Next.js (App Router) · Prisma (SQLite → Neon Postgres) · Auth.js (admin role) · Route Handlers · admin lives under `/admin/*`

---

## The core idea — two doors, one database

- The **storefront** reads through `/api/*` — public, read‑only.
- The **admin** writes through `/api/admin/*` — private, login‑only.
- Same database. One door is public and cannot change anything; the other is
  authenticated and can.

Everything the store shows (products, prices, badges, page content) becomes an
**editable record** in the admin instead of being hard‑coded in a seed script.

---

## The sidebar — eight places to work

The sidebar is organised **by job, not by page**. There is no separate sidebar
for Sale, New In, etc.

| Section | Group | What it manages |
|---|---|---|
| **Dashboard** | Overview | Today's orders & revenue, low‑stock alerts, recent activity |
| **Orders** | Sell | Everything a checkout creates: status (new/paid/fulfilled), detail, refunds |
| **Products** | Catalog | The heart — add/edit/archive products, colours, sizes, images, price, badges |
| **Collections** | Catalog | The 6 shop categories, New In, Sale, Bestsellers — assign which products show |
| **Content** | Storefront | Home hero, brand block, looks, banners, announcement bar, About, mega‑menu |
| **Customers** | People | Accounts, contact info, order history, addresses |
| **Discounts** | Sell | "Buy 3+, Save 15%", on‑sale (compare‑at) prices, codes & date windows |
| **Settings** | Config | Currency & INR rate, shipping, store info, admin users & roles |

---

## Storefront section → who edits it

Your pages are made of blocks. Nothing stays hard‑coded — each block is controlled
by an admin screen and backed by a table.

| Storefront section | Edited in admin | Database table |
|---|---|---|
| Home · Hero slides | Content → Home → Hero | `HeroSlide` *(new)* |
| Home · Bestselling T‑shirts | Collections → Bestsellers | `Product.bestseller` |
| Home · Featured collections | Content → Home → Collections | `Collection` |
| Home · Behind the Brand | Content → Home → Brand | `BrandContent` |
| Home · As Styled By You (looks) | Content → Home → Looks | `Look` |
| New In · banner + products | Collections → New In | `CollectionPage` + `Product` |
| Shop · All Products grid | Products (the catalog) | `Product` → `Card` |
| Shop · category tags | Collections (T‑shirts, Socks…) | `Category` *(new)* |
| Sale · banner + products | Discounts + Collections → Sale | `Product.compareAtPrice` |
| About · page copy & images | Content → About | `Page` *(new)* |
| Header · Shop mega‑menu | Content → Navigation | `MenuGroup` + `MenuLink` |
| Announcement bar | Content → Announcement | `Setting` *(new)* |

---

## Data model (overview)

Grouped by job. **have** = already in `schema.prisma`; **add** = introduced by the
admin + checkout work. (Full production detail is in
[`system-architecture.md`](./system-architecture.md).)

- **Catalog** — `Product` *(have)*, `Card` *(have)*, `ProductVariant` *(add)*, `Category` *(add)*, `Inventory` *(add)*
- **Content** — `BrandContent` *(have)*, `Look` *(have)*, `CollectionPage` *(have)*, `HeroSlide` *(add)*, `Page`/`Setting` *(add)*
- **Commerce** — `Cart`, `Order`, `OrderItem`, `Discount` *(all add)*
- **Access & people** — `User`, `Customer`, `Address` *(add)*, `MenuGroup` *(have)*

---

## The purchase flow (add‑to‑cart → order)

The loop that connects the storefront to the admin:

1. **Add to cart** — shopper picks a colour + size; a cart is saved to their session → `POST /api/cart`
2. **Cart drawer** — line items, quantities, subtotal, "Buy 3+" applied live → `GET /api/cart`
3. **Checkout** — contact + shipping address, review totals, choose payment → `/checkout`
4. **Pay** — mock success first, then Razorpay; on success an `Order` is created → `POST /api/checkout`
5. **Admin sees it** — order lands in **Orders** as "New"; you fulfil it, stock drops → `/admin/orders`

---

## Routes & protection

Two route trees; the admin one is guarded.

**Admin (private):**
- `PAGE  /admin/login`
- `PAGE  /admin` (dashboard)
- `PAGE  /admin/products/[id]`
- `POST  /api/admin/products`
- `PUT   /api/admin/products/[id]`
- `POST  /api/admin/upload` (images)
- `PUT   /api/admin/content/home`

**Storefront (public, read‑only):**
- `GET   /api/cards`
- `GET   /api/cards?category=…`
- `GET   /api/products?bestseller=true`
- `GET   /api/collection-page?slug=…`
- `POST  /api/cart`
- `POST  /api/checkout`

**Guard once, cover all:** a middleware on `/admin/:path*` and `/api/admin/:path*`
verifies the Auth.js session and `role === "admin"`. Write it in one place and
every admin screen is protected.

---

## Build in phases (storefront never breaks)

Each phase ships something usable and leaves the live site working.

| Phase | Focus | Includes |
|---|---|---|
| **1** | Login + Products | Auth.js + admin `User`, the `/admin` shell, full Products CRUD, image upload, middleware guard |
| **2** | Collections + Content | The 6 categories, New In / Sale grouping, content editors (hero, brand, looks, banners, mega‑menu) |
| **3** | Cart + Checkout + Orders | Cart drawer, checkout form, mock payment, `Order`/`OrderItem`, Orders + Customers screens |
| **4** | Payments + Polish | Razorpay, Discounts, Dashboard stats, Settings (INR rate, shipping), deploy on Neon Postgres |

Start with **Phase 1** — managing products unlocks the most.
