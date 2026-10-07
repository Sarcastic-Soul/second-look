import { parse } from "tldts";
import type { FoundLink } from "../types";

const MAX_LINKS = 8;
const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]}]+/gi;
// Scam texts often drop the scheme: "usps-redelivery.info/us". Validated against the public suffix list below.
const BARE_RE = /(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>"'`)\]}]*)?/gi;
const HREF_RE = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

function trimPunctuation(url: string): string {
  return url.replace(/[.,;:!?'"»”’]+$/, "");
}

/** Registrable domain ("hdfcbank-secure-verify.com") or the bare IP / hostname when there is none. */
export function registrableDomain(urlOrHost: string): string | null {
  const p = parse(urlOrHost);
  if (p.isIp) return p.hostname;
  return p.domain ?? null;
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalise(candidate: string): string | null {
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`;
  try {
    const u = new URL(trimPunctuation(withScheme));
    if (!u.hostname.includes(".")) return null;
    const p = parse(u.hostname);
    if (!p.isIp && !(p.domain && p.isIcann)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Every web link in the message, with what an HTML link showed versus where it really goes. */
export function extractLinks(text: string, html?: string): FoundLink[] {
  const found = new Map<string, FoundLink>();
  const add = (url: string | null, shownAs?: string) => {
    if (!url || found.size >= MAX_LINKS) return;
    const prev = found.get(url);
    if (!prev) found.set(url, { url, shownAs });
    else if (!prev.shownAs && shownAs) prev.shownAs = shownAs;
  };

  if (html) {
    for (const m of html.matchAll(HREF_RE)) {
      const href = m[2].trim().replace(/&amp;/g, "&");
      if (!/^https?:/i.test(href)) continue;
      const shown = stripTags(m[3]);
      add(normalise(href), shown && shown !== href ? shown.slice(0, 120) : undefined);
    }
  }
  for (const m of text.matchAll(URL_RE)) add(normalise(m[0]));
  for (const m of text.matchAll(BARE_RE)) {
    // Skip things like "e.g." and file names: require a known public suffix (checked in normalise)
    // and something that looks like a site, not "file.png".
    if (/\.(png|jpe?g|gif|pdf|docx?|xlsx?|zip|txt)$/i.test(m[0])) continue;
    const before = text.slice(Math.max(0, m.index - 8), m.index);
    if (/:\/\/$/.test(before)) continue; // already caught with its scheme
    add(normalise(m[0]));
  }
  return [...found.values()];
}

/**
 * HTML links whose visible text is itself a web address on a different domain:
 * the text says "paypal.com" but the click goes somewhere else.
 */
export function mismatchedLinks(links: FoundLink[]): { link: FoundLink; shownDomain: string; realDomain: string }[] {
  const out: { link: FoundLink; shownDomain: string; realDomain: string }[] = [];
  for (const link of links) {
    if (!link.shownAs) continue;
    const shownCandidate = link.shownAs.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,24}/i)?.[0];
    if (!shownCandidate) continue;
    const shownDomain = registrableDomain(shownCandidate);
    const realDomain = registrableDomain(link.url);
    if (shownDomain && realDomain && shownDomain !== realDomain) out.push({ link, shownDomain, realDomain });
  }
  return out;
}
