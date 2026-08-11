// The SHARED size guide — one constant table for every size-chart product (it is
// NOT admin-editable per product; it lives here in code and is served through
// /api/size-guide, localized for the shopper's language). Mirrors the live
// lavenderhillclothing.com Size Guide modal exactly (7 rows, full How To Measure).

export type SizeGuideRow = {
  size: string; // letter size (XXS…XXL) — the row's leftmost cell
  uk: string;
  us: string;
  eu: string;
  bust: [string, string]; // [cm, inches] — rendered on two lines
  waist: [string, string];
  hips: [string, string];
};
export type HowToMeasureItem = { term: string; desc: string };
export type SizeGuide = {
  title: string;
  intro: string;
  headers: string[]; // Size · UK · US · EU · Bust · Waist · Hips
  rows: SizeGuideRow[];
  howToTitle: string;
  howTo: HowToMeasureItem[];
};

// The UK size palette a product offers when `sizeChart` is on. Stored VERBATIM as
// the size labels ("UK 8"…"UK 16"), so the size buttons, cart lines, per-size
// stock keys and the shop size-filter all read the same string — no transforms.
export const UK_SIZES = ["UK 8", "UK 10", "UK 12", "UK 14", "UK 16"];
// The default letter palette (unchanged behaviour when sizeChart is off).
export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const SIZE_GUIDE: SizeGuide = {
  title: "Size Guide",
  intro:
    "Our clothing is fitted and trialled on real women and our body measurements reflect this. To help you choose the best size, please use the size guide below.",
  headers: ["Size", "UK", "US", "EU", "Bust", "Waist", "Hips"],
  rows: [
    { size: "XXS", uk: "6", us: "2", eu: "34", bust: ["76cm", '30"'], waist: ["61cm", '24"'], hips: ["88cm", '35"'] },
    { size: "XS", uk: "8", us: "4", eu: "36", bust: ["81cm", '32"'], waist: ["66cm", '26"'], hips: ["93cm", '37"'] },
    { size: "S", uk: "10", us: "6", eu: "38", bust: ["86cm", '34"'], waist: ["71cm", '28"'], hips: ["98cm", '39"'] },
    { size: "M", uk: "12", us: "8", eu: "40", bust: ["91cm", '36"'], waist: ["76cm", '30"'], hips: ["103cm", '41"'] },
    { size: "L", uk: "14", us: "10", eu: "42", bust: ["96cm", '38"'], waist: ["81cm", '32"'], hips: ["108cm", '43"'] },
    { size: "XL", uk: "16", us: "12", eu: "44", bust: ["102cm", '40"'], waist: ["86cm", '34"'], hips: ["113cm", '45"'] },
    { size: "XXL", uk: "18", us: "14", eu: "46", bust: ["104cm", '42"'], waist: ["91cm", '36"'], hips: ["118cm", '47"'] },
  ],
  howToTitle: "How To Measure",
  howTo: [
    { term: "Bust", desc: "Measure the full circumference around the fullest part of your chest or bust including the shoulder blades. Make sure to keep the tape measure straight and level." },
    { term: "Waist", desc: "Measure a full circumference just above the natural waistline." },
    { term: "Hips", desc: "Women's hips should be measured around the fullest part of the bottom." },
    { term: "Sleeve Length", desc: "We measure the sleeve length from the shoulder seam to the cuff." },
    { term: "Body Length", desc: "We measure the length of our tops and dresses from the centre back of the garment to the hem." },
    { term: "Inseam", desc: "We measure the leg length from the crotch, along the inside leg seam to the bottom of the hem." },
  ],
};
