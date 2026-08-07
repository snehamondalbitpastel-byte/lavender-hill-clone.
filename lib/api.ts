// ============================================================
// Central API layer — EVERY data call goes through here.
// One place to change the base URL, headers, or error handling.
// Components never call fetch() directly; they call these functions.
// ============================================================

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    throw new Error(`API request failed (${res.status}) for ${path}`);
  }
  return res.json() as Promise<T>;
}

// ---- Types (the shape of the data each endpoint returns) ----

export type Product = {
  id: number;
  title: string;
  slug: string;
  price: string;
  image: string;
  hover: string;
  rating: number;
  reviews: number;
  badge: string | null;
  colors: string[];
  productType: string;
  sizes: string[];
  bestseller: boolean;
  // On-sale products (e.g. New Arrivals): struck-through original + plum
  // "Save Rs. X" badge. Absent/null on full-price products.
  compareAt?: string | null;
  saveBadge?: string | null;
};

// A single shop-grid card = one colour of a product (the live grid explodes
// each product into one card per colour). Shaped like Product so <ProductCard>
// renders it unchanged.
export type Card = {
  id: number;
  order: number;
  productSlug: string;
  colour: string | null;
  title: string;
  price: string;
  image: string;
  hover: string;
  rating: number;
  reviews: number;
  badge: string | null;
  saveBadge: string | null;
  swatch: string; // this card's own colour hex (for the filter swatch)
  colors: string[];
  productType: string;
  sizes: string[];
  bestseller: boolean;
};

export type Collection = {
  id: number;
  title: string;
  href: string;
  image: string;
};

export type BrandTile = {
  img: string;
  title: string;
  href: string | null;
};

export type BrandContent = {
  id: number;
  title: string;
  description: string;
  videoSrc: string;
  videoPoster: string;
  tiles: BrandTile[];
};

export type Look = {
  id: number;
  look: string;
  hotspotTop: string;
  hotspotLeft: string;
  name: string;
  price: string;
  productImg: string;
  productImgAlt: string;
  colors: string[];
  href: string;
};

export type MenuLink = {
  id: number;
  label: string;
  href: string;
};

export type MenuGroup = {
  id: number;
  title: string;
  href: string;
  links: MenuLink[];
};

// ---- Resource functions (one per endpoint) ----

export function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/products");
}

// Shop grid — one card per colour. Optional category filters to that category.
export function getCards(category?: string): Promise<Card[]> {
  return apiFetch<Card[]>(
    category ? `/cards?category=${encodeURIComponent(category)}` : "/cards"
  );
}

// Sale collection — only the on-sale colour cards (those with a saveBadge).
export function getSaleCards(): Promise<Card[]> {
  return apiFetch<Card[]>("/cards?sale=true");
}

// New In collection — only the colour cards whose product is flagged "New In".
export function getNewInCards(): Promise<Card[]> {
  return apiFetch<Card[]>("/cards?new=true");
}

// Home "Our Bestselling T-Shirts" — cards whose product is flagged "Bestseller".
export function getBestsellerCards(): Promise<Card[]> {
  return apiFetch<Card[]>("/cards?bestseller=true");
}

// Home-page hero carousel slides (admin-managed via /api/hero).
export type HeroButton = { label: string; href: string; variant: "taupe" | "light" | "outline" };
export type HeroSlide = {
  id: number;
  title: string;
  bold: boolean;
  align: "start" | "center" | "end";
  image: string;
  position: string;
  gradient: string;
  overlay: string;
  titleSize: string;
  box: string;
  buttons: HeroButton[];
  order: number;
  active: boolean;
};
export function getHero(): Promise<HeroSlide[]> {
  return apiFetch<HeroSlide[]>("/hero");
}

// A category node (nested via parentId).
export type Category = {
  id: number;
  handle: string;
  label: string;
  heading: string;
  description: string;
  parentId: number | null;
};

// Homepage "Bestsellers" — the flagged subset.
export function getBestsellers(): Promise<Product[]> {
  return apiFetch<Product[]>("/products?bestseller=true");
}

// New Arrivals — a distinct product set (not the shop catalogue).
export function getNewIn(): Promise<Product[]> {
  return apiFetch<Product[]>("/new-in");
}

// ---- Single product detail (/products/[id]) ----
import type { ProductContent } from "@/lib/products";

export type ProductColour = {
  name: string;
  hex: string;
  image: string;
  hover: string;
  stock?: number | null; // colour-level fallback (used when the product has no sizes)
  sizeStock?: Record<string, number | null>; // per-size units; null on a size = untracked
};
export type RelatedProduct = {
  slug: string;
  title: string;
  price: string;
  compareAt: string | null;
  saveBadge: string | null;
  image: string;
  hover: string;
};
export type ProductFull = {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  saveBadge: string | null;
  image: string;
  hover: string;
  rating: number;
  reviews: number;
  badge: string | null;
  productType: string;
  colours: ProductColour[]; // each colour carries its own stock
  sizes: string[];
  content: ProductContent;
  related: RelatedProduct[];
};

// Fetch one product's full detail by numeric id OR slug.
export function getProduct(idOrSlug: string): Promise<ProductFull> {
  return apiFetch<ProductFull>(`/products/${encodeURIComponent(idOrSlug)}`);
}

export function getCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>("/collections");
}

export function getBrand(): Promise<BrandContent> {
  return apiFetch<BrandContent>("/brand");
}

export function getLooks(): Promise<Look[]> {
  return apiFetch<Look[]>("/looks");
}

export function getMenu(): Promise<MenuGroup[]> {
  return apiFetch<MenuGroup[]>("/menu");
}

export type Crumb = { label: string; href: string };

export type CollectionPage = {
  id: number;
  slug: string;
  title: string;
  description: string;
  breadcrumbs: Crumb[];
  links: Crumb[];
};

// A listing page's banner (breadcrumb + heading + description + category links).
export function getCollectionPage(slug: string): Promise<CollectionPage> {
  return apiFetch<CollectionPage>(`/collection-page?slug=${slug}`);
}
