// The storefront's country → display-currency map, transcribed to match the live
// Lavender Hill site EXACTLY (its Shopify Markets config). Keyed by ISO 3166-1
// alpha-2 (cca2) so it's language-independent; the display NAME is taken from the
// `world-countries` dataset (localised by the UI language), and the currency here
// is what the live site shows for that country. Many markets the live UK store
// doesn't localise fall back to GBP — that's faithful, not a bug.
//
// Only these countries are offered in the selector (anything not listed is
// excluded, so there are no "extra" countries vs the real site). Conversion uses
// the live /api/rates feed for each currency.
export const MARKET_CURRENCY: Record<string, string> = {
  AF: "AFN", ZA: "GBP", AL: "ALL", DE: "EUR", AD: "EUR", AI: "XCD", AG: "XCD",
  SA: "SAR", AR: "GBP", AM: "AMD", AW: "AWG", AU: "AUD", AT: "EUR", AZ: "AZN",
  BS: "BSD", BH: "GBP", BD: "BDT", BB: "BBD", BE: "EUR", BZ: "BZD", BM: "USD",
  BT: "GBP", BY: "GBP", BO: "BOB", BA: "BAM", BR: "GBP", BN: "BND", BG: "EUR",
  KH: "KHR", CA: "CAD", CL: "GBP", CN: "CNY", CO: "GBP", KR: "KRW", CR: "CRC",
  HR: "EUR", CW: "ANG", DK: "DKK", DM: "XCD", AE: "AED", EC: "USD", ES: "EUR",
  EE: "EUR", VA: "EUR", US: "USD", FJ: "FJD", FI: "EUR", FR: "EUR", GE: "GBP",
  GS: "GBP", GI: "GBP", GR: "EUR", GD: "XCD", GL: "DKK", GT: "GTQ", GG: "GBP",
  GY: "GYD", HT: "GBP", HN: "HNL", HU: "HUF", BV: "NOK", CX: "AUD", NF: "AUD",
  IM: "GBP", AX: "EUR", KY: "KYD", CC: "AUD", CK: "NZD", FO: "DKK", HM: "AUD",
  FK: "FKP", PN: "NZD", SB: "SBD", TC: "USD", VG: "USD", UM: "USD", IN: "INR",
  ID: "IDR", IQ: "GBP", IE: "EUR", IS: "ISK", IL: "ILS", IT: "EUR", JM: "JMD",
  JP: "JPY", JE: "GBP", JO: "GBP", KZ: "KZT", KG: "KGS", KI: "GBP", XK: "EUR",
  KW: "GBP", LA: "LAK", LV: "EUR", LB: "LBP", LI: "CHF", LT: "EUR", LU: "EUR",
  MK: "MKD", MY: "MYR", MV: "MVR", MT: "EUR", YT: "EUR", MX: "GBP", MD: "MDL",
  MC: "EUR", MN: "MNT", ME: "EUR", MS: "XCD", MM: "MMK", NR: "AUD", NP: "NPR",
  NI: "NIO", NU: "NZD", NO: "NOK", NC: "XPF", NZ: "NZD", OM: "GBP", UZ: "UZS",
  PK: "PKR", PA: "USD", PG: "PGK", PY: "PYG", NL: "EUR", BQ: "USD", PE: "PEN",
  PH: "PHP", PL: "PLN", PF: "XPF", PT: "EUR", QA: "QAR", HK: "HKD", MO: "MOP",
  DO: "DOP", RO: "RON", GB: "GBP", RU: "GBP", KN: "XCD", SM: "EUR", SX: "ANG",
  VC: "XCD", LC: "XCD", SV: "USD", WS: "WST", RS: "RSD", SG: "SGD", SK: "EUR",
  SI: "EUR", LK: "LKR", SE: "SEK", CH: "CHF", SR: "GBP", SJ: "NOK", TJ: "TJS",
  TW: "TWD", CZ: "CZK", IO: "USD", PS: "ILS", TH: "THB", TL: "USD", TK: "NZD",
  TO: "TOP", TT: "TTD", TM: "GBP", TR: "GBP", TV: "AUD", UA: "UAH", UY: "UYU",
  VU: "VUV", VE: "USD", VN: "VND", WF: "XPF", YE: "YER",
};

// True when a country is one the live site offers.
export function isMarket(cca2: string): boolean {
  return Object.prototype.hasOwnProperty.call(MARKET_CURRENCY, cca2);
}
