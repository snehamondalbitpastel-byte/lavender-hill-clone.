// Country list for the address form — { name, ISO-2 code, dial code }.
// The flag emoji is derived from the ISO-2 code (regional-indicator letters),
// so no image assets are needed.

export type Country = { name: string; code: string; dial: string };

export const COUNTRIES: Country[] = [
  { name: "Australia", code: "AU", dial: "61" },
  { name: "Austria", code: "AT", dial: "43" },
  { name: "Bangladesh", code: "BD", dial: "880" },
  { name: "Belgium", code: "BE", dial: "32" },
  { name: "Brazil", code: "BR", dial: "55" },
  { name: "Bulgaria", code: "BG", dial: "359" },
  { name: "Canada", code: "CA", dial: "1" },
  { name: "China", code: "CN", dial: "86" },
  { name: "Croatia", code: "HR", dial: "385" },
  { name: "Cyprus", code: "CY", dial: "357" },
  { name: "Czechia", code: "CZ", dial: "420" },
  { name: "Denmark", code: "DK", dial: "45" },
  { name: "Egypt", code: "EG", dial: "20" },
  { name: "Estonia", code: "EE", dial: "372" },
  { name: "Finland", code: "FI", dial: "358" },
  { name: "France", code: "FR", dial: "33" },
  { name: "Germany", code: "DE", dial: "49" },
  { name: "Greece", code: "GR", dial: "30" },
  { name: "Hong Kong SAR", code: "HK", dial: "852" },
  { name: "Hungary", code: "HU", dial: "36" },
  { name: "Iceland", code: "IS", dial: "354" },
  { name: "India", code: "IN", dial: "91" },
  { name: "Indonesia", code: "ID", dial: "62" },
  { name: "Ireland", code: "IE", dial: "353" },
  { name: "Israel", code: "IL", dial: "972" },
  { name: "Italy", code: "IT", dial: "39" },
  { name: "Japan", code: "JP", dial: "81" },
  { name: "Kenya", code: "KE", dial: "254" },
  { name: "Kuwait", code: "KW", dial: "965" },
  { name: "Latvia", code: "LV", dial: "371" },
  { name: "Lithuania", code: "LT", dial: "370" },
  { name: "Luxembourg", code: "LU", dial: "352" },
  { name: "Malaysia", code: "MY", dial: "60" },
  { name: "Malta", code: "MT", dial: "356" },
  { name: "Mexico", code: "MX", dial: "52" },
  { name: "Netherlands", code: "NL", dial: "31" },
  { name: "New Zealand", code: "NZ", dial: "64" },
  { name: "Nigeria", code: "NG", dial: "234" },
  { name: "Norway", code: "NO", dial: "47" },
  { name: "Pakistan", code: "PK", dial: "92" },
  { name: "Philippines", code: "PH", dial: "63" },
  { name: "Poland", code: "PL", dial: "48" },
  { name: "Portugal", code: "PT", dial: "351" },
  { name: "Qatar", code: "QA", dial: "974" },
  { name: "Romania", code: "RO", dial: "40" },
  { name: "Saudi Arabia", code: "SA", dial: "966" },
  { name: "Singapore", code: "SG", dial: "65" },
  { name: "Slovakia", code: "SK", dial: "421" },
  { name: "Slovenia", code: "SI", dial: "386" },
  { name: "South Africa", code: "ZA", dial: "27" },
  { name: "South Korea", code: "KR", dial: "82" },
  { name: "Spain", code: "ES", dial: "34" },
  { name: "Sri Lanka", code: "LK", dial: "94" },
  { name: "Sweden", code: "SE", dial: "46" },
  { name: "Switzerland", code: "CH", dial: "41" },
  { name: "Thailand", code: "TH", dial: "66" },
  { name: "Turkey", code: "TR", dial: "90" },
  { name: "Ukraine", code: "UA", dial: "380" },
  { name: "United Arab Emirates", code: "AE", dial: "971" },
  { name: "United Kingdom", code: "GB", dial: "44" },
  { name: "United States", code: "US", dial: "1" },
  { name: "Vietnam", code: "VN", dial: "84" },
];

// 🇬🇧 from "GB" — regional-indicator letters.
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export function dialForCountry(name: string): string {
  return COUNTRIES.find((c) => c.name === name)?.dial ?? "";
}

export function codeForCountry(name: string): string {
  return COUNTRIES.find((c) => c.name === name)?.code ?? "";
}

// Indian states/UTs — shown as a dropdown when Country = India (matches the
// live checkout). Other countries use a plain text State field.
export const INDIAN_STATES: string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

