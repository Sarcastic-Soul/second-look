// Organisations scammers most often pretend to be, with their real domains.
// `keywords` are matched against message text and against the letters of a link's domain.
export interface Brand {
  name: string;
  domains: string[];
  keywords: string[];
}

export const BRANDS: Brand[] = [
  // Delivery
  { name: "USPS", domains: ["usps.com", "usps.gov"], keywords: ["usps"] },
  { name: "UPS", domains: ["ups.com"], keywords: ["ups"] },
  { name: "FedEx", domains: ["fedex.com"], keywords: ["fedex"] },
  { name: "DHL", domains: ["dhl.com", "dhl.de", "dhl.co.in"], keywords: ["dhl"] },
  { name: "India Post", domains: ["indiapost.gov.in"], keywords: ["indiapost", "india post"] },
  { name: "Royal Mail", domains: ["royalmail.com"], keywords: ["royalmail", "royal mail"] },
  // Banks and payments (India)
  { name: "HDFC Bank", domains: ["hdfcbank.com", "hdfc.bank.in", "hdfcbank.net", "hdfc.com"], keywords: ["hdfc"] },
  { name: "State Bank of India", domains: ["sbi.co.in", "onlinesbi.sbi", "sbi.bank.in", "onlinesbi.com"], keywords: ["sbi", "state bank of india", "onlinesbi"] },
  { name: "ICICI Bank", domains: ["icicibank.com", "icici.bank.in"], keywords: ["icici"] },
  { name: "Axis Bank", domains: ["axisbank.com", "axis.bank.in"], keywords: ["axisbank", "axis bank"] },
  { name: "Kotak Mahindra Bank", domains: ["kotak.com", "kotak.bank.in"], keywords: ["kotak"] },
  { name: "Paytm", domains: ["paytm.com", "paytmbank.com"], keywords: ["paytm"] },
  { name: "PhonePe", domains: ["phonepe.com"], keywords: ["phonepe"] },
  { name: "NPCI / UPI", domains: ["npci.org.in"], keywords: ["npci"] },
  // Banks and payments (global)
  { name: "PayPal", domains: ["paypal.com", "paypal.me"], keywords: ["paypal"] },
  { name: "Chase", domains: ["chase.com", "jpmorganchase.com"], keywords: ["chase bank", "jpmorgan"] },
  { name: "Bank of America", domains: ["bankofamerica.com", "bofa.com"], keywords: ["bank of america", "bankofamerica", "bofa"] },
  { name: "Wells Fargo", domains: ["wellsfargo.com"], keywords: ["wells fargo", "wellsfargo"] },
  { name: "Venmo", domains: ["venmo.com"], keywords: ["venmo"] },
  { name: "Zelle", domains: ["zellepay.com"], keywords: ["zelle"] },
  { name: "Cash App", domains: ["cash.app", "squareup.com"], keywords: ["cash app", "cashapp"] },
  { name: "Coinbase", domains: ["coinbase.com"], keywords: ["coinbase"] },
  { name: "Binance", domains: ["binance.com"], keywords: ["binance"] },
  { name: "Visa", domains: ["visa.com", "visa.co.in"], keywords: ["visa card"] },
  { name: "Mastercard", domains: ["mastercard.com", "mastercard.co.in"], keywords: ["mastercard"] },
  // Government
  { name: "Income Tax Department (India)", domains: ["incometax.gov.in", "incometaxindia.gov.in"], keywords: ["income tax", "incometax"] },
  { name: "UIDAI / Aadhaar", domains: ["uidai.gov.in", "myaadhaar.uidai.gov.in"], keywords: ["aadhaar", "aadhar", "uidai"] },
  { name: "IRS", domains: ["irs.gov"], keywords: ["irs", "internal revenue service"] },
  { name: "Social Security Administration", domains: ["ssa.gov"], keywords: ["social security administration"] },
  { name: "HMRC", domains: ["gov.uk"], keywords: ["hmrc"] },
  { name: "Parivahan / e-Challan", domains: ["parivahan.gov.in", "echallan.parivahan.gov.in"], keywords: ["parivahan", "e-challan", "echallan"] },
  // Shopping, telecom, travel
  { name: "Amazon", domains: ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de"], keywords: ["amazon"] },
  { name: "Flipkart", domains: ["flipkart.com"], keywords: ["flipkart"] },
  { name: "Walmart", domains: ["walmart.com"], keywords: ["walmart"] },
  { name: "Jio", domains: ["jio.com"], keywords: ["jio"] },
  { name: "Airtel", domains: ["airtel.in", "airtel.com"], keywords: ["airtel"] },
  { name: "IRCTC", domains: ["irctc.co.in"], keywords: ["irctc"] },
  { name: "Swiggy", domains: ["swiggy.com", "swiggy.in"], keywords: ["swiggy"] },
  { name: "Zomato", domains: ["zomato.com"], keywords: ["zomato"] },
  // Tech accounts
  { name: "Apple", domains: ["apple.com", "icloud.com"], keywords: ["apple id", "icloud", "apple support"] },
  { name: "Microsoft", domains: ["microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com"], keywords: ["microsoft", "office365", "outlook"] },
  { name: "Google", domains: ["google.com", "gmail.com", "youtube.com", "goo.gl"], keywords: ["google account", "gmail"] },
  { name: "Meta / Facebook", domains: ["facebook.com", "fb.com", "meta.com", "facebookmail.com"], keywords: ["facebook", "meta business"] },
  { name: "Instagram", domains: ["instagram.com"], keywords: ["instagram"] },
  { name: "WhatsApp", domains: ["whatsapp.com"], keywords: ["whatsapp"] },
  { name: "Netflix", domains: ["netflix.com"], keywords: ["netflix"] },
  { name: "LinkedIn", domains: ["linkedin.com"], keywords: ["linkedin"] },
  { name: "DocuSign", domains: ["docusign.com", "docusign.net"], keywords: ["docusign"] },
  { name: "Norton", domains: ["norton.com"], keywords: ["norton"] },
  { name: "McAfee", domains: ["mcafee.com"], keywords: ["mcafee"] },
  { name: "Geek Squad / Best Buy", domains: ["bestbuy.com", "geeksquad.com"], keywords: ["geek squad", "geeksquad"] },
];

export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "ymail.com", "outlook.com", "hotmail.com",
  "live.com", "msn.com", "aol.com", "icloud.com", "me.com", "proton.me", "protonmail.com", "gmx.com",
  "mail.com", "zoho.com", "yandex.com", "rediffmail.com",
]);

export const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "rb.gy", "cutt.ly", "is.gd", "ow.ly", "s.id", "shorturl.at", "tiny.cc",
  "rebrand.ly", "buff.ly", "t.ly", "bl.ink", "short.io", "v.gd", "qr.co", "lnkd.in", "wa.link", "shorturl.gg",
]);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Brands the message text mentions by name (whole-word match, so "ups" doesn't fire on "groups"). */
export function brandsMentioned(text: string): Brand[] {
  const t = text.toLowerCase();
  return BRANDS.filter((b) => b.keywords.some((k) => new RegExp(`(^|[^a-z0-9])${escapeRe(k)}([^a-z0-9]|$)`).test(t)));
}

/** True when the hostname is one of the brand's domains or a subdomain of one. */
export function isOfficialHost(brand: Brand, hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return brand.domains.some((d) => h === d || h.endsWith(`.${d}`));
}

export function officialBrandFor(hostname: string): Brand | undefined {
  return BRANDS.find((b) => isOfficialHost(b, hostname));
}
