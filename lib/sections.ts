// The section-based page builder.
//
// A content page (model Page) can be built from an ordered list of "sections".
// Each section is { id, type, data }. `data` is a map keyed by the fields the
// section type declares below. A field value is EITHER a scalar string, OR — for
// "list" fields — an array of item records, OR — for "collections" fields — an
// array of collection handles.
//
// This registry is the SINGLE SOURCE OF TRUTH used by:
//   • the admin editor (app/components/admin/PagesManager) — renders one input
//     per field (incl. repeatable list items + a live collections picker) and an
//     "add section" menu from SECTION_DEFS,
//   • the API (app/api/admin/pages) — normalizeSections() sanitises what's saved,
//   • the renderer (app/components/pages/PageSections) — draws each section.
//
// To add a new block type: add a SectionDef here + a case in PageSections. The
// admin editor and normaliser pick it up automatically.

export type SectionFieldKind =
  | "text"
  | "textarea"
  | "image"
  | "url"
  | "video"
  | "select"
  | "list" // repeatable sub-items (itemFields are scalar only)
  | "collections"; // array of collection handles (live picker in admin)

export type SectionField = {
  key: string;
  label: string;
  kind: SectionFieldKind;
  options?: { value: string; label: string }[]; // for kind "select"
  itemFields?: SectionField[]; // for kind "list"
  addLabel?: string; // for kind "list"
  placeholder?: string;
  help?: string;
};

export type SectionDef = {
  type: string;
  label: string; // shown in the admin "add section" menu
  description: string;
  fields: SectionField[];
  defaults: Record<string, string>; // scalar defaults by key
};

export type ItemRecord = Record<string, string>;
export type SectionValue = string | ItemRecord[] | string[];
export type SectionData = Record<string, SectionValue>;
export type PageSection = { id: string; type: string; data: SectionData };

// ---- Value accessors (used by renderers; each field kind has one) -----------
export const asText = (v: SectionValue | undefined): string => (typeof v === "string" ? v : "");
export const asItems = (v: SectionValue | undefined): ItemRecord[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as ItemRecord[]) : [];
export const asHandles = (v: SectionValue | undefined): string[] =>
  Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];

const ALIGN = [
  { value: "center", label: "Centred" },
  { value: "left", label: "Left" },
];

export const SECTION_DEFS: SectionDef[] = [
  {
    type: "richText",
    label: "Heading + text",
    description: "A centred (or left) heading, paragraphs, and an optional button. Also good for a lone button.",
    fields: [
      { key: "heading", label: "Heading", kind: "text", placeholder: "Our Story" },
      { key: "body", label: "Text", kind: "textarea", help: "Each new line = a paragraph." },
      { key: "align", label: "Alignment", kind: "select", options: ALIGN },
      {
        key: "width",
        label: "Content width",
        kind: "select",
        options: [
          { value: "xs", label: "Narrow (42.5rem)" },
          { value: "sm", label: "Medium (61.25rem)" },
          { value: "md", label: "Wide (71.875rem)" },
        ],
      },
      { key: "ctaLabel", label: "Button label", kind: "text", placeholder: "Discover More (optional)" },
      { key: "ctaHref", label: "Button link", kind: "url", placeholder: "/pages/press-as-seen-on" },
    ],
    defaults: { heading: "", body: "", align: "center", width: "sm", ctaLabel: "", ctaHref: "" },
  },
  {
    type: "imageText",
    label: "Image + text",
    description: "An image on one side with a heading and text on the other.",
    fields: [
      { key: "image", label: "Image URL", kind: "image" },
      { key: "alt", label: "Image alt text", kind: "text" },
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Text", kind: "textarea", help: "Each new line = a paragraph." },
      {
        key: "layout",
        label: "Image side",
        kind: "select",
        options: [
          { value: "image-left", label: "Image on the left" },
          { value: "image-right", label: "Image on the right" },
        ],
      },
      {
        key: "textWidth",
        label: "Text width",
        kind: "select",
        options: [
          { value: "normal", label: "Normal" },
          { value: "narrow", label: "Narrow (≈430px)" },
        ],
      },
    ],
    defaults: { image: "", alt: "", heading: "", body: "", layout: "image-left", textWidth: "normal" },
  },
  {
    type: "scrollCarousel",
    label: "Scrolling image + text carousel",
    description: "A horizontal, draggable row of image cards; the active card shows its heading + text.",
    fields: [
      {
        key: "items",
        label: "Slides",
        kind: "list",
        addLabel: "+ Add slide",
        itemFields: [
          { key: "image", label: "Image URL", kind: "image" },
          { key: "alt", label: "Alt text", kind: "text" },
          { key: "heading", label: "Heading", kind: "text" },
          { key: "body", label: "Text", kind: "textarea" },
        ],
      },
    ],
    defaults: {},
  },
  {
    type: "logoColumns",
    label: "Logo columns (e.g. In The Press)",
    description: "A heading over a row of logo/image cards with captions — press mentions, awards, etc.",
    fields: [
      { key: "heading", label: "Heading", kind: "text", placeholder: "In The Press" },
      {
        key: "items",
        label: "Logos",
        kind: "list",
        addLabel: "+ Add logo",
        itemFields: [
          { key: "image", label: "Image URL", kind: "image" },
          { key: "alt", label: "Alt text", kind: "text" },
          { key: "label", label: "Caption", kind: "text", placeholder: "Vogue" },
          { key: "href", label: "Link (optional)", kind: "url" },
        ],
      },
    ],
    defaults: { heading: "" },
  },
  {
    type: "quoteImage",
    label: "Quote over image",
    description: "A full-width background image with a quote overlaid on top (e.g. a founder quote).",
    fields: [
      { key: "image", label: "Background image URL", kind: "image" },
      { key: "alt", label: "Image alt text", kind: "text" },
      { key: "quote", label: "Quote", kind: "textarea", placeholder: "The words to overlay…" },
      { key: "attribution", label: "Attribution", kind: "text", placeholder: "— Isobel Ridley, Founder" },
    ],
    defaults: { image: "", alt: "", quote: "", attribution: "" },
  },
  {
    type: "mediaGrid",
    label: "Media grid (e.g. Behind The Seams)",
    description: "A large featured video/image beside a set of image cards that link to other pages.",
    fields: [
      { key: "heading", label: "Heading", kind: "text", placeholder: "Behind The Seams" },
      { key: "featuredVideo", label: "Featured video URL (mp4)", kind: "video", placeholder: "https://…mp4 (optional)" },
      { key: "featuredImage", label: "Featured image URL", kind: "image", help: "Used as the video poster, or shown if no video." },
      { key: "featuredAlt", label: "Featured alt text", kind: "text" },
      {
        key: "items",
        label: "Cards",
        kind: "list",
        addLabel: "+ Add card",
        itemFields: [
          { key: "image", label: "Image URL", kind: "image" },
          { key: "alt", label: "Alt text", kind: "text" },
          { key: "heading", label: "Card heading", kind: "text" },
          { key: "body", label: "Card text", kind: "textarea" },
          { key: "href", label: "Link", kind: "url" },
        ],
      },
    ],
    defaults: { heading: "", featuredVideo: "", featuredImage: "", featuredAlt: "" },
  },
  {
    type: "timeline",
    label: "Timeline / tabs carousel",
    description: "Tabbed items — click a label to reveal that item's image, heading and text (e.g. charities).",
    fields: [
      { key: "heading", label: "Heading (optional)", kind: "text" },
      {
        key: "items",
        label: "Items",
        kind: "list",
        addLabel: "+ Add item",
        itemFields: [
          { key: "nav", label: "Tab label", kind: "text", placeholder: "KLS" },
          { key: "image", label: "Image URL", kind: "image" },
          { key: "alt", label: "Alt text", kind: "text" },
          { key: "heading", label: "Heading", kind: "text" },
          { key: "body", label: "Text", kind: "textarea" },
        ],
      },
    ],
    defaults: { heading: "" },
  },
  {
    type: "mediaText",
    label: "Media + text (e.g. Meet Our Founder)",
    description: "An image and/or video beside an eyebrow, heading, text and button.",
    fields: [
      { key: "eyebrow", label: "Eyebrow (small heading)", kind: "text", placeholder: "Meet Our Founder" },
      { key: "heading", label: "Heading", kind: "text", placeholder: "Isobel Ridley" },
      { key: "body", label: "Text", kind: "textarea" },
      { key: "image", label: "Image URL", kind: "image" },
      { key: "alt", label: "Image alt text", kind: "text" },
      { key: "video", label: "Video URL (mp4, optional)", kind: "video" },
      { key: "poster", label: "Video poster image (optional)", kind: "image" },
      { key: "ctaLabel", label: "Button label", kind: "text", placeholder: "Discover More" },
      { key: "ctaHref", label: "Button link", kind: "url" },
    ],
    defaults: { eyebrow: "", heading: "", body: "", image: "", alt: "", video: "", poster: "", ctaLabel: "", ctaHref: "" },
  },
  {
    type: "collectionList",
    label: "Discover Our Collections (live)",
    description: "A heading over a draggable row of collection cards. Pick collections; they fetch live.",
    fields: [
      { key: "heading", label: "Heading", kind: "text", placeholder: "Discover Our Collections" },
      { key: "handles", label: "Collections", kind: "collections" },
    ],
    defaults: { heading: "" },
  },
];

export const sectionDef = (type: string): SectionDef | undefined =>
  SECTION_DEFS.find((d) => d.type === type);

export const sectionLabel = (type: string): string => sectionDef(type)?.label ?? type;

const str = (v: unknown) => String(v ?? "").trim();

function normalizeItem(fields: SectionField[], v: unknown): ItemRecord {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = (v && typeof v === "object" ? v : {}) as any;
  const rec: ItemRecord = {};
  for (const f of fields) rec[f.key] = str(src[f.key]);
  return rec;
}

// Sanitise a section list from the client. Unknown types are dropped; each known
// section keeps only its declared fields. List fields become clean item arrays;
// collections fields become clean handle arrays. Ids preserved or derived from
// position (no RNG — safe to run server-side).
export function normalizeSections(v: unknown): PageSection[] {
  if (!Array.isArray(v)) return [];
  const out: PageSection[] = [];
  for (const raw of v) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = raw as any;
    const type = str(r?.type);
    const def = sectionDef(type);
    if (!def) continue;
    const dataIn = r?.data && typeof r.data === "object" ? r.data : {};
    const data: SectionData = {};
    for (const f of def.fields) {
      if (f.kind === "list") {
        const arr = Array.isArray(dataIn[f.key]) ? dataIn[f.key] : [];
        data[f.key] = arr.map((it: unknown) => normalizeItem(f.itemFields ?? [], it));
      } else if (f.kind === "collections") {
        const arr = Array.isArray(dataIn[f.key]) ? dataIn[f.key] : [];
        data[f.key] = arr.map((x: unknown) => str(x)).filter(Boolean);
      } else {
        data[f.key] = str(dataIn[f.key] ?? def.defaults[f.key] ?? "");
      }
    }
    const id = str(r?.id) || `s-${out.length}-${type}`;
    out.push({ id, type, data });
  }
  return out;
}

// Parse the JSON string stored on Page.sections into a validated section list.
export function parseSections(json: string | null | undefined): PageSection[] {
  try {
    return normalizeSections(JSON.parse(json || "[]"));
  } catch {
    return [];
  }
}
