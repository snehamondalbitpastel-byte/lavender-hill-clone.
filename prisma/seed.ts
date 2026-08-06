// Seeds the database with the site's current content (one-time, re-runnable).
// Run with:  npm run seed   (or  npx prisma db seed)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import { regenerateCards } from "../lib/cards";

const prisma = new PrismaClient();

type SeedProduct = {
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
};

// All 56 products — generated from the live store's product JSON
// (see prisma/products.json). Regenerate by re-running the transform.
const products: SeedProduct[] = JSON.parse(
  fs.readFileSync(new URL("./products.json", import.meta.url), "utf8")
);

type SeedCard = {
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
  colors: string[];
  productType: string;
  sizes: string[];
  bestseller: boolean;
};

// The existing shop grid — used ONLY to backfill each product's colourData /
// compareAtPrice, so regenerateCards() reproduces the exact same grid.
const cards: SeedCard[] = JSON.parse(
  fs.readFileSync(new URL("./cards.json", import.meta.url), "utf8")
);

// New Arrivals product set (used for the `isNew` flag).
const newArrivals: { slug: string }[] = JSON.parse(
  fs.readFileSync(new URL("./new-arrivals.json", import.meta.url), "utf8")
);
const newSlugs = new Set(newArrivals.map((p) => p.slug));

// Colour name -> hex (only for the admin form's swatch; cards use product.colors).
const COLOUR_HEX: Record<string, string> = {
  Aquamarine: "#b4dede", Birch: "#deb39c", Black: "#000000", Blue: "#3160a6",
  "Blue Stripe": "#c5d0e3", Brown: "#8b4513", Burgundy: "#800020", Chocolate: "#7b3f00",
  Coffee: "#6f4e37", Cream: "#e7dac8", Crimson: "#dc143c", "Dark Red": "#c23331",
  Foam: "#669eab", Green: "#2e7d32", Grey: "#808080", Ivory: "#fffff0",
  Lavender: "#b4adce", "Light Blue": "#b3cbdc", "Light Grey": "#d3d3d3", "Light Pink": "#efcfd9",
  Mango: "#e3af57", Natural: "#d2c1b6", Navy: "#24243d", "Off White": "#eef1f1",
  Olive: "#7c7a69", Orange: "#e28743", "Peach Puff": "#ffdab9", Pink: "#be5a9f",
  Red: "#c0392b", "Rosy Brown": "#8f7060", "Royal Blue": "#133e93", Silver: "#c0c0c0",
  Skiing: "#dfe6ec", Taupe: "#d6b39e", Violet: "#4540a0", Wedgewood: "#84a4cb",
  White: "#ffffff", Wine: "#740f21", "Winter White": "#f5f0e6", Yellow: "#e2dcb4",
};
const hexFor = (n: string) => COLOUR_HEX[n] || n.toLowerCase().replace(/\s+/g, "") || "#cccccc";

// Map a productType to one of the 6 shop categories.
function categoryFor(type: string): string {
  const t = type.toLowerCase();
  if (/sock/.test(t)) return "socks";
  if (/scarf|glove|hat|cashmere accessor|face mask|neckwarmer|snood|wristwarmer/.test(t)) return "accessories";
  if (/jumper|lounge|trouser|legging|nightwear|pyjama|dress/.test(t)) return "loungewear";
  if (/toiletr|lavender scented|soap|essential oil|candle/.test(t)) return "toiletries";
  if (/t-shirt|top|tank|vest|polo/.test(t)) return "t-shirts";
  return "";
}

const num = (s: string | null) => {
  const m = (s ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};
const fmtINR = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-US") + ".00";

// Group the existing cards by product for the colourData backfill.
const cardsBySlug = new Map<string, SeedCard[]>();
for (const c of cards) {
  const arr = cardsBySlug.get(c.productSlug) ?? [];
  arr.push(c);
  cardsBySlug.set(c.productSlug, arr);
}

// Default shop categories (top-level). Upserted so admin-added ones survive.
const categories = [
  {
    handle: "t-shirts", label: "T-shirts", order: 0, heading: "Luxury Women's T-shirts",
    description:
      "Welcome to our collection of women's luxury t-shirts, where premium quality meets timeless design. Crafted from sustainable fabrics including cotton-modal blends and linen, these t-shirts offer unparalleled softness and durability. Available in a range of necklines and sleeve lengths, they're versatile additions to any wardrobe.",
  },
  {
    handle: "loungewear", label: "Loungewear", order: 1, heading: "Women's Loungewear",
    description:
      "Relax in refined comfort. Our loungewear pairs soft, breathable fabrics with an elevated, easy fit — from ribbed lounge sets to cosy jumpers and trousers made to be lived in.",
  },
  {
    handle: "underwear", label: "Underwear", order: 2, heading: "Women's Underwear",
    description:
      "Everyday essentials in the softest sustainable fabrics — designed to feel like a second skin and disappear under everything you wear.",
  },
  {
    handle: "socks", label: "Socks", order: 3, heading: "Women's Socks",
    description:
      "From breathable cotton to cosy cashmere and merino wool, our socks bring quiet luxury to the smallest detail of your wardrobe.",
  },
  {
    handle: "accessories", label: "Accessories", order: 4, heading: "Women's Accessories",
    description:
      "The finishing touches — scarves, gloves, hats and cashmere accessories crafted from natural, sustainable materials to keep you warm in effortless style.",
  },
  {
    handle: "toiletries", label: "Toiletries", order: 5, heading: "Lavender Toiletries",
    description:
      "Lavender-scented essentials for a calm, considered routine — bottled with the same care for sustainability as everything we make.",
  },
];

const collections = [
  { title: "Sleeveless Tops", href: "#", image: "/category-sleeveless.jpg", order: 0 },
  { title: "Short Sleeve T-shirts", href: "#", image: "/category-short-sleeve.jpg", order: 1 },
  { title: "Mid sleeve T-shirts", href: "#", image: "/category-mid-sleeve.jpg", order: 2 },
  { title: "Long Sleeve T-shirts", href: "#", image: "/category-long-sleeve.jpg", order: 3 },
];

const brand = {
  title: "Behind The Brand",
  description:
    "At Lavender Hill, our journey began with a simple idea: to create luxurious, sustainable basics that feel as good as they look. Founded by Isobel Ridley, our brand is built on a passion for high-quality, eco-friendly fashion that never compromises on style or comfort.",
  videoSrc:
    "https://cdn.shopify.com/videos/c/vp/23fc846ecd034c8fb5c4445f084499ae/23fc846ecd034c8fb5c4445f084499ae.HD-1080p-7.2Mbps-13973859.mp4",
  videoPoster: "/brand-video-poster.jpg",
  tiles: [
    { img: "/brand-details.jpg", title: "It's All In The Details", href: null as string | null },
    { img: "/brand-fit.png", title: "We're meticulous about fit", href: null as string | null },
    { img: "/brand-made.png", title: "We care who makes our clothes", href: null as string | null },
    { img: "/brand-founder.jpg", title: "Meet Our Founder", href: "#" as string | null },
  ],
};

const looks = [
  {
    look: "/look-skirt.png",
    hotspotTop: "40%",
    hotspotLeft: "19%",
    name: "Organic Cotton Scoop Neck Tank Top",
    price: "Rs. 5,900.00",
    productImg: "/product-scoop-tank.jpg",
    productImgAlt: "/product-scoop-tank-alt.jpg",
    colors: ["#ffffff", "#8f7060", "#e7dac8"],
    href: "#",
    order: 0,
  },
  {
    look: "/look-longsleeve.png",
    hotspotTop: "35%",
    hotspotLeft: "60%",
    name: "Long Sleeve Crew Neck Cotton Modal T-Shirt",
    price: "Rs. 7,800.00",
    productImg: "/product-longsleeve-crew.jpg",
    productImgAlt: "/product-longsleeve-crew-alt.jpg",
    colors: ["#ffffff", "#24243d", "#000000"],
    href: "#",
    order: 1,
  },
  {
    look: "/look-suit.png",
    hotspotTop: "35%",
    hotspotLeft: "49%",
    name: "Sleeveless Micro Modal Vest Top",
    price: "Rs. 5,900.00",
    productImg: "/product-vest-top.jpg",
    productImgAlt: "/product-vest-top-alt.jpg",
    colors: ["#ffffff", "#000000", "#24243d", "#d6b39e", "#c0c0c0", "#ffdab9"],
    href: "#",
    order: 2,
  },
];

// Shop mega-menu: each group is a column (heading + sub-links). Hrefs are "#"
// (the clone has no collection pages yet).
const menu: { title: string; links: string[] }[] = [
  { title: "T-shirts By Sleeve Length", links: ["Sleeveless Tops", "Short Sleeve T-shirts", "Half Sleeve T-shirts", "3/4 Sleeve T-shirts", "Long Sleeve T-shirts", "View All"] },
  { title: "T-shirts By Neckline", links: ["Crew Neck T-shirts", "Scoop Neck T-shirts", "V Neck T-shirts", "Mock Neck Tops", "Roll Neck Tops", "View All"] },
  { title: "T-shirts By Colour", links: ["White T-shirts", "Black T-shirts", "Navy T-shirts", "Pink T-shirts", "Lavender T-shirts", "View All"] },
  { title: "T-shirts By Fabric", links: ["Linen T-shirts", "Organic Cotton Tops", "Cotton Modal Tops", "Tencel Lyocell Tops", "Tencel Micro Modal Tops", "View All"] },
  { title: "Loungewear / Nightwear", links: ["Nightwear", "Lounge Jumpers", "Trousers & Leggings", "Accessories", "View All"] },
  { title: "Activewear", links: ["Bralette", "Leggings & Trousers", "View All"] },
  { title: "Socks", links: ["Cotton Socks", "Cashmere Socks", "Merino Wool Socks", "View All"] },
  { title: "Gifting", links: ["Lavender Candles", "Essential Oils", "Hats & Gloves", "Scarves", "View All"] },
  { title: "Gift Guide", links: ["Mother's Day", "The Conscious Gifter", "Home & Wellness", "Gifts Under £100", "Gifts Under £50"] },
  { title: "Bundle & Save", links: [] },
  { title: "Back in Stock", links: [] },
  { title: "Sale", links: [] },
  { title: "Shop All Products", links: [] },
];

// Collection / landing-page banners (the "first half" of a listing page).
const collectionPages = [
  {
    slug: "new-in",
    title: "New Arrivals",
    description:
      "Welcome to our New Arrivals collection, featuring the latest styles, shapes, and shades designed with softness, sustainability, and simplicity in mind. Each piece is crafted from eco-friendly fabrics like cashmere, linen, and modal, ensuring you can update your wardrobe with peace of mind. Explore our newest t-shirts, nightwear, loungewear, jewellery, and accessories to find your next wardrobe staple.",
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "New Arrivals", href: "/new-in" },
    ],
    links: [
      { label: "T-shirts", href: "/collections/t-shirts" },
      { label: "Nightwear", href: "/collections/nightwear" },
      { label: "Loungewear", href: "/collections/loungewear" },
      { label: "Cashmere Accessories", href: "/collections/cashmere-accessories" },
    ],
  },
];

async function main() {
  // Admin account — upsert (kept across re-seeds). Only the bcrypt hash is
  // stored; the plaintext password lives only in .env (gitignored).
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: "admin" },
      create: { email: adminEmail, name: "Sneha Mondal", passwordHash, role: "admin" },
    });
    console.log(`Admin ready: ${adminEmail}`);
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — skipped admin seed.");
  }

  // Categories — upsert defaults (admin-managed, so don't wipe extras).
  for (const c of categories) {
    await prisma.category.upsert({
      where: { handle: c.handle },
      update: { label: c.label, order: c.order, heading: c.heading, description: c.description },
      create: c,
    });
  }

  // Clear then re-insert so the script is safe to re-run.
  await prisma.card.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.brandContent.deleteMany();
  await prisma.look.deleteMany();
  await prisma.menuGroup.deleteMany(); // cascade-deletes its links
  await prisma.collectionPage.deleteMany();

  for (const [idx, p] of products.entries()) {
    const pCards = cardsBySlug.get(p.slug) ?? [];
    // Per-colour source for the shop cards (skip colourless products).
    const colourData = pCards
      .filter((c) => c.colour)
      .map((c) => ({
        name: c.colour as string,
        hex: hexFor(c.colour as string),
        image: c.image,
        hover: c.hover,
      }));
    // Reconstruct the original price from the sale badge (price + saved amount).
    const save = pCards.find((c) => c.saveBadge)?.saveBadge ?? null;
    const compareAtPrice = save ? fmtINR(num(p.price) + num(save)) : null;

    await prisma.product.create({
      data: {
        title: p.title,
        slug: p.slug,
        description: "",
        category: categoryFor(p.productType),
        productType: p.productType,
        price: p.price,
        compareAtPrice,
        image: p.image,
        hover: p.hover,
        rating: p.rating,
        reviews: p.reviews,
        badge: p.badge,
        colors: JSON.stringify(p.colors),
        sizes: JSON.stringify(p.sizes),
        colourData: JSON.stringify(colourData),
        order: idx,
        bestseller: p.bestseller,
        isNew: newSlugs.has(p.slug),
      },
    });
  }

  // Build the shop cards FROM the products — the same path the admin uses, so
  // seed and admin-edit always produce an identical grid.
  const cardCount = await regenerateCards(prisma);
  for (const c of collections) {
    await prisma.collection.create({ data: c });
  }
  await prisma.brandContent.create({
    data: { ...brand, tiles: JSON.stringify(brand.tiles) },
  });
  for (const l of looks) {
    await prisma.look.create({
      data: { ...l, colors: JSON.stringify(l.colors) },
    });
  }
  for (const [gi, g] of menu.entries()) {
    await prisma.menuGroup.create({
      data: {
        title: g.title,
        href: "#",
        order: gi,
        links: {
          create: g.links.map((label, li) => ({ label, href: "#", order: li })),
        },
      },
    });
  }
  for (const cp of collectionPages) {
    await prisma.collectionPage.create({
      data: {
        slug: cp.slug,
        title: cp.title,
        description: cp.description,
        breadcrumbs: JSON.stringify(cp.breadcrumbs),
        links: JSON.stringify(cp.links),
      },
    });
  }

  console.log(
    `Seeded: ${products.length} products, ${cardCount} cards (regenerated), ${collections.length} collections, 1 brand block, ${looks.length} looks, ${menu.length} menu groups, ${collectionPages.length} collection pages`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
