# Lavender Hill — System Architecture

> The real‑world structure a store like Lavender Hill runs on — no tricks, no
> jugaad. How products, variants, attributes, collections, filters, and orders
> relate; how one request assembles a page; and the security & scaling rules that
> keep it correct as the catalog grows.

Companion to [`admin-dashboard-blueprint.md`](./admin-dashboard-blueprint.md).

---

## Six rules that make it real (not a hack)

Get these right and everything else — filters, nested categories, counts — falls
out naturally instead of needing special‑case code.

1. **Product ≠ Variant.** A *Product* is the concept ("Crew Neck T‑shirt"). A
   *Variant* is one buyable unit (Navy / M) with its own SKU, price & stock. Cart
   and orders reference **variants** — never products.
2. **Attributes are typed, not text.** Neckline, Sleeve, Fit, Fabric, Colour, Size
   are structured fields — not one `productType` string. This typed metadata is
   what every filter and "Shop by…" menu is built from.
3. **Collections = membership.** A product joins many collections. Membership is
   either **manual** (hand‑picked) or a **rule** ("type = T‑shirt"). Nesting is one
   collection pointing at a parent.
4. **Filters are derived, never stored.** Facets = the distinct attribute values of
   the products in the current view, counted live. You store products; the filter
   options and every `(count)` compute themselves.
5. **Orders snapshot everything.** At checkout, copy the price, title & discount
   into the order. Editing a product later must never change a past order. History
   is immutable.
6. **Read / write split + one guard.** Public traffic reads through `/api/*`. Every
   change goes through authenticated `/api/admin/*`. A single middleware enforces
   the boundary.

---

## Entity model

Five domains. **have** = already in `schema.prisma`; **add** = introduced by the
production model. `PK` = primary key, `FK` = foreign key.

### Catalog
| Entity | Status | Key fields |
|---|---|---|
| `Product` | have | **id** · handle · title · status · bestseller |
| `ProductVariant` | add | **id** · *productId* · sku · colour · size · price · compareAt |
| `ProductAttribute` | add | *productId* · neckline · sleeve · fit · fabric |
| `ProductImage` | have | **id** · *variantId* · url · position |
| `Inventory` | add | *variantId* · stock |

### Merchandising
| Entity | Status | Key fields |
|---|---|---|
| `Collection` | partial | **id** · handle · title · *parentId* · type |
| `CollectionRule` | add | *collectionId* · field · op · value |
| `CollectionProduct` | add | *collectionId* · *productId* (join for manual collections) |
| `MenuItem` | have | **id** · label · *parentId* · href |
| `FacetConfig` | add | *collectionId* · facets[] (which filters this collection shows) |

### Commerce
| Entity | Status | Key fields |
|---|---|---|
| `Cart` | add | **id** · sessionId |
| `CartLine` | add | *cartId* · *variantId* · qty |
| `Order` | add | **id** · number · status · total · *customerId* |
| `OrderLine` | add | *orderId* · titleSnap · priceSnap · qty (**snapshots**) |
| `Discount` | add | **code** · rule · window |

### Content
| Entity | Status | Key fields |
|---|---|---|
| `HeroSlide` | add | **id** · image · heading · order |
| `BrandContent` | have | **id** · title · tiles |
| `Look` | have | **id** · productImg · hotspot |
| `Page` | add | **slug** · title · body |
| `Setting` | add | **key** · value |

### Access
| Entity | Status | Key fields |
|---|---|---|
| `User` (admin) | add | **id** · email · role · passwordHash |
| `Session` | add | **id** · *userId* · expires |
| `Customer` | add | **id** · email · name |
| `Address` | add | **id** · *customerId* · line1 · pin |

### Relationships
- `Product` **1—∗** `ProductVariant`
- `ProductVariant` **1—∗** `ProductImage`
- `Product` **∗—∗** `Collection` (via `CollectionProduct`)
- `Collection` **→ self** (`parentId`, for nesting)
- `Cart` **1—∗** `CartLine` **→∗** `ProductVariant`
- `Order` **1—∗** `OrderLine` (price/title snapshots)
- `Customer` **1—∗** `Order`

---

## Product → Variants (the one that matters most)

A product isn't a single row. It fans out into variants — one per **Colour × Size**.
The **variant** has the price, stock count, and is what gets added to a cart. Your
"one card per colour" grid is just the first variant of each colour.

```
Product: "Crew Neck Cotton Modal T-shirt"  (status: Active, bestseller)
  Options: Colour × Size
  ├─ Navy / M    SKU T-C-NVY-12   Rs. 6,400   stock 24
  ├─ Navy / L    SKU T-C-NVY-14   Rs. 6,400   stock 11
  ├─ Black / M   SKU T-C-BLK-12   Rs. 6,400   stock 0   ← sold out
  ├─ White / S   SKU T-C-WTE-10   Rs. 6,400   stock 40
  └─ Cream / M   SKU T-C-CRM-12   Rs. 6,400   stock 9
```

**Why it matters:** stock, "sold out", and the cart all live at the variant level.
Black / M can be sold out while Navy / M is in stock. Put price + inventory on the
*Product* and you can never model that — the classic beginner trap this avoids.

---

## Attributes are the source; filters are the mirror

You enter attributes on the product; the filter sidebar is **computed** from the
attributes of whatever products are in the current collection, with live counts.
You never author the filter list.

**What you store, per product:**
```js
{
  type: "Long Sleeve T-shirt",
  neckline: "Crew Neck",
  sleeve: "Long Sleeve",
  fit: "Regular",
  fabric: "Cotton Modal",
  // variants carry colour + size
}
```

**What shoppers see, computed live:**
```
Neckline
  Crew Neck (6)
  Scoop Neck (4)
Colour · Navy (18)
Size · M (22)
```

```js
// filters are never stored — they are computed:
const colours = distinct(productsInView.flatMap(p => p.variants.map(v => v.colour)));
//  → ["Black","Navy","White","Cream"]   (+ a count each)
```

Same code on every page — different products in view → different options and
counts. This is exactly why New Arrivals showed `Long Sleeve (6)` while the T‑shirts
collection showed `Long Sleeve (9)`: 9 exist, only 6 are new. **The number is a live
`COUNT`, never a stored value.**

---

## Collections: manual or by rule

Every `/collections/<handle>` route is a **Collection**. It gets its products one of
two ways:

**Type A — Manual.** You hand‑pick products (rows in `CollectionProduct`). Best for a
curated edit ("Founder's Picks").

**Type B — Automated (a rule).** You write one condition; every matching product
joins automatically and leaves when it stops matching. No hand‑adding.

```
T-shirts      →  type contains "T-shirt"
New Arrivals  →  createdAt > now − 30d
Sale          →  variant.compareAt is set
Crew Neck     →  neckline = "Crew"
```

**Nesting is just a parent link.** "T‑shirts › Shop by Neckline › Crew Neck" is three
Collections, each pointing at its parent via `parentId`. The leaf ("Crew Neck") is an
automated collection with rule `neckline = Crew`. The mega‑menu is built by walking
that tree.

### Why the same label shows (6) here and (9) there
A single product sits in **many** collections at once (it's new **and** a t‑shirt
**and** has a sleeve length). The filter count means *"how many are in **this**
collection"* — so the same "Long Sleeve T‑shirt" reads `(6)` in New Arrivals and
`(9)` in the T‑shirts collection. Nobody types the number; it's a live count.

---

## The collection‑page request lifecycle

A category page is a single request carrying collection + filters + sort. The server
does five steps and returns products, facets, and pagination together.

```
GET /api/collections/t-shirts?neckline=crew-neck&colour=navy&sort=price-asc&page=1
```

1. **Resolve** — load the `t-shirts` collection and its rule / membership
2. **Select** — the base product set matching the collection
3. **Filter** — AND the active facets: neckline=crew, colour=navy
4. **Sort + page** — order by price, take page 1 (48 per page)
5. **Count** — distinct attribute values + counts over the filtered set

**Response — one payload the page renders:**
```json
{
  "products":   [ "… 48 cards …" ],
  "pagination": { "page": 1, "pages": 2, "total": 56 },
  "facets": {
    "neckline": [ { "value": "scoop", "count": 4 } ],
    "colour":   [ { "value": "white", "count": 22 } ],
    "size":     [ { "value": "m",     "count": 31 } ]
  }
}
```

Sort is a **fixed enum** applied as a query param — not data you manage:
`featured · best-selling · a-z · z-a · price-asc · price-desc · date-asc · date-desc`.

---

## Layered API — thin routes, real services

Don't put Prisma calls straight in route handlers. Four layers keep logic testable
and put validation + auth at the edge.

| Layer | Location | Responsibility |
|---|---|---|
| **Route handler** | `app/api/**/route.ts` | Parse request, validate input (Zod), call a service, shape response. No business logic. |
| **Guard (middleware)** | `/admin` · `/api/admin` | Check Auth.js session + `role === "admin"` before any admin route runs. One place, total coverage. |
| **Service** | `lib/services/*.ts` | Business rules: build a collection query, compute facets, apply a discount, decrement stock in a transaction. |
| **Repository** | `lib/db/*.ts` (Prisma) | The only place that talks to the database. Indexable, mockable in tests. |

**Storefront (public read):** `GET /api/collections/[handle]` · `GET /api/products/[handle]` · `GET /api/search?q=` · `POST /api/cart` · `POST /api/checkout`

**Admin (authenticated write):** `CRUD /api/admin/products` · `CRUD /api/admin/collections` (+rules) · `CRUD /api/admin/content` · `/orders` · `POST /api/admin/upload`

---

## Security & scale (non‑negotiables)

**Security**
- **Auth boundary** — middleware on `/api/admin/*`; role‑checked; logged‑out → login.
- **Validate every input** — a Zod schema per mutation; reject bad shapes at the edge.
- **Never trust client price** — recompute totals server‑side at checkout from variant + discount.
- **Hash passwords** (bcrypt/argon2); sessions `httpOnly`; CSRF on mutations.
- **Least privilege** — public API is read‑only; no write path skips the guard.

**Scale**
- **Index the query paths** — `product.status`, `variant.sku`, collection joins, `order.customerId`.
- **Paginate always** — never return the whole catalog; cursor pagination for big lists.
- **Materialize rule membership** on product save, so collection pages are a simple indexed read.
- **Cache reads, invalidate on write** — Next.js cache tags; bust the tag when the admin edits.
- **Postgres (Neon) + image CDN** in production; SQLite stays for local dev.

---

## The through‑line

> Store **facts once** (products, variants, attributes, collection rules), **compute
> everything else on demand** (filters, counts, menus), **snapshot the irreversible**
> (orders), and **guard the one door** that can change things. That is what
> "production‑grade" means here.
