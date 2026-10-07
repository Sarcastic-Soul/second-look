import { parse } from "tldts";
import { dkimVerify } from "mailauth/lib/dkim/verify";
import { BRANDS, FREE_MAIL_DOMAINS, URL_SHORTENERS, brandsMentioned, isOfficialHost, officialBrandFor, type Brand } from "./brands";
import { extractLinks, hostnameOf, mismatchedLinks, registrableDomain } from "./links";
import { domainAge, traceRedirects, type RedirectTrace } from "./net";
import { withTimeout } from "../text";
import type { CheckResult, FoundLink, Suspect } from "../types";

const CHECK_TIMEOUT_MS = 8_000;
const MAX_AGE_LOOKUPS = 4;
/** How much of the body to scan for brand names (the rest is usually footer). */
const BODY_BRAND_WINDOW = 1_500;

interface TracedLink extends FoundLink {
  trace: RedirectTrace;
  host: string | null;
  finalHost: string | null;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** "hdfcbank-secure-verify.com" -> "hdfcbank-secure-verify" (the part a person reads as the name). */
function domainLabel(registrable: string): string {
  const suffix = parse(registrable).publicSuffix ?? "";
  return suffix ? registrable.slice(0, -(suffix.length + 1)) : registrable;
}

/** A brand whose name is inside the domain's letters, or whose real domain is one or two typos away. */
function impersonatedBrand(host: string): { brand: Brand; how: "name" | "typo" | "punycode" } | null {
  const registrable = registrableDomain(host);
  if (!registrable || officialBrandFor(host)) return null;
  const label = domainLabel(registrable);
  const tokens = label.split(/[^a-z0-9]+/);
  for (const brand of BRANDS) {
    for (const k of brand.keywords) {
      const squashed = k.replace(/[^a-z0-9]/g, "");
      // Short names like "ups" or "sbi" must be a whole token, or "groups-online.com" would match.
      const hit = squashed.length >= 4 ? label.replace(/-/g, "").includes(squashed) : tokens.includes(squashed);
      if (hit) return { brand, how: "name" };
    }
  }
  for (const brand of BRANDS) {
    for (const d of brand.domains) {
      const real = domainLabel(d);
      if (real.length < 4 || real === label) continue;
      const limit = real.length >= 7 ? 2 : 1;
      if (Math.abs(real.length - label.length) <= limit && levenshtein(real, label) <= limit) return { brand, how: "typo" };
    }
  }
  if (host.split(".").some((p) => p.startsWith("xn--"))) {
    return { brand: { name: "a well-known site", domains: [], keywords: [] }, how: "punycode" };
  }
  return null;
}

async function traceAll(links: FoundLink[]): Promise<TracedLink[]> {
  return Promise.all(
    links.map(async (l) => {
      const trace = await traceRedirects(l.url).catch((e: Error) => ({ chain: [l.url], finalUrl: l.url, error: e.message }));
      return { ...l, trace, host: hostnameOf(l.url), finalHost: hostnameOf(trace.finalUrl) };
    }),
  );
}

function linkChecks(links: TracedLink[]): CheckResult[] {
  const out: CheckResult[] = [];
  const seenRedirects = new Set<string>();
  for (const l of links) {
    if (!l.host) continue;
    const startDomain = registrableDomain(l.host);
    const endDomain = l.finalHost ? registrableDomain(l.finalHost) : null;
    if (parse(l.host).isIp) {
      out.push({
        id: `ip-link:${l.host}`,
        name: "Link uses a bare number address",
        status: "fail",
        detail: `A link points to ${l.host}, a raw number instead of a website name. Real companies don't do this.`,
      });
    }
    // Only short links get a result: newsletters route every link through click trackers, which is normal.
    if (startDomain && endDomain && startDomain !== endDomain && URL_SHORTENERS.has(startDomain) && !seenRedirects.has(endDomain)) {
      seenRedirects.add(endDomain);
      out.push({
        id: `redirect:${startDomain}->${endDomain}`,
        name: "Short link hides the real site",
        status: "warn",
        detail: `The short link ${startDomain} hides where it goes: it actually ends up at ${endDomain}.`,
        data: { chain: l.trace.chain },
      });
    }
  }
  for (const m of mismatchedLinks(links)) {
    out.push({
      id: `link-text:${m.realDomain}`,
      name: "Link text doesn't match where it goes",
      status: "fail",
      detail: `A link is shown as "${m.shownDomain}" but clicking it goes to ${m.realDomain}.`,
    });
  }
  return out;
}

function impersonationChecks(hosts: string[]): CheckResult[] {
  const out: CheckResult[] = [];
  const seen = new Set<string>();
  for (const host of hosts) {
    const reg = registrableDomain(host);
    if (!reg || seen.has(reg)) continue;
    seen.add(reg);
    const official = officialBrandFor(host);
    if (official) {
      out.push({ id: `lookalike:${reg}`, name: "Link goes to a real company site", status: "pass", detail: `${reg} is an official ${official.name} website.` });
      continue;
    }
    const imp = impersonatedBrand(host);
    if (!imp) continue;
    const detail =
      imp.how === "name"
        ? `${reg} uses ${imp.brand.name}'s name but is not one of ${imp.brand.name}'s websites (${imp.brand.domains.slice(0, 2).join(", ")}).`
        : imp.how === "typo"
          ? `${reg} looks almost the same as ${imp.brand.name}'s real site ${imp.brand.domains[0]}, but it is a different website.`
          : `${host} uses letters from other alphabets that look like normal letters, a common trick to copy real site names.`;
    out.push({ id: `lookalike:${reg}`, name: "Copycat website name", status: "fail", detail });
  }
  return out;
}

async function ageChecks(hosts: string[]): Promise<CheckResult[]> {
  const domains = [...new Set(hosts.map(registrableDomain).filter((d): d is string => !!d && !parse(d).isIp))]
    .filter((d) => !officialBrandFor(d) && !URL_SHORTENERS.has(d))
    .slice(0, MAX_AGE_LOOKUPS);
  return Promise.all(
    domains.map(async (d): Promise<CheckResult> => {
      const age = await domainAge(d);
      const id = `domain-age:${d}`;
      const name = "Website age";
      if (age.notFound) return { id, name, status: "warn", detail: `${d} isn't a registered website (never existed, or already taken down).` };
      if (age.ageDays === undefined) return { id, name, status: "unknown", detail: `Couldn't look up when ${d} was created (${age.error}).` };
      const when = age.registered!.toISOString().slice(0, 10);
      if (age.ageDays < 30) return { id, name, status: "fail", detail: `${d} was created only ${age.ageDays} days ago (${when}). Scam sites are usually brand new.`, data: { ageDays: age.ageDays } };
      if (age.ageDays < 180) return { id, name, status: "warn", detail: `${d} is quite new: created ${age.ageDays} days ago (${when}).`, data: { ageDays: age.ageDays } };
      return { id, name, status: "pass", detail: `${d} has existed since ${when}.`, data: { ageDays: age.ageDays } };
    }),
  );
}

function brandMismatchCheck(s: Suspect, hosts: string[]): CheckResult[] {
  if (hosts.length === 0) return [];
  const mentioned = brandsMentioned(`${s.subject ?? ""}\n${s.sender?.name ?? ""}\n${s.text.slice(0, BODY_BRAND_WINDOW)}`).slice(0, 2);
  return mentioned.map((brand): CheckResult => {
    const toBrand = hosts.filter((h) => isOfficialHost(brand, h));
    const id = `brand-links:${brand.name}`;
    if (toBrand.length === hosts.length) {
      return { id, name: "Links match the company named", status: "pass", detail: `The message mentions ${brand.name} and every link goes to ${brand.name}'s real website.` };
    }
    if (toBrand.length === 0) {
      return { id, name: "Links don't go to the company named", status: "warn", detail: `The message talks about ${brand.name}, but none of its links go to ${brand.name}'s real website (${brand.domains[0]}).` };
    }
    return { id, name: "Some links go elsewhere", status: "unknown", detail: `Some links go to ${brand.name}'s real site, others go to different websites.` };
  });
}

function senderChecks(s: Suspect): CheckResult[] {
  const out: CheckResult[] = [];
  const addr = s.sender?.address;
  if (!addr) return out;
  const senderDomain = registrableDomain(addr.split("@")[1] ?? "");
  if (!senderDomain) return out;
  const host = addr.split("@")[1]!;
  const freeMail = FREE_MAIL_DOMAINS.has(senderDomain);
  // A brand named only in the body counts when the sender is a personal account: a company newsletter
  // naming LinkedIn in its footer is normal, a Gmail address writing "your HDFC account" is not.
  const claimed =
    brandsMentioned(`${s.sender?.name ?? ""}\n${s.subject ?? ""}`)[0] ??
    (freeMail ? brandsMentioned(s.text.slice(0, BODY_BRAND_WINDOW))[0] : undefined);
  if (claimed) {
    if (isOfficialHost(claimed, host)) {
      out.push({
        id: "sender-brand",
        name: "Sender address matches the company",
        status: s.channel === "email-attachment" ? "pass" : "unknown",
        detail: `The sender address is on ${claimed.name}'s real domain (${senderDomain}).${s.channel === "email-attachment" ? "" : " Sender addresses can be faked, so this alone doesn't prove it."}`,
      });
    } else if (freeMail) {
      out.push({ id: "sender-brand", name: "Company email from a personal account", status: "fail", detail: `It claims to be ${claimed.name}, but was sent from a free personal ${senderDomain} address. Real companies don't email you from Gmail or Yahoo.` });
    } else {
      out.push({ id: "sender-brand", name: "Sender isn't the company named", status: "warn", detail: `It mentions ${claimed.name}, but the sender's address is on ${senderDomain}, not ${claimed.domains[0]}.` });
    }
  }
  if (s.replyTo) {
    const replyDomain = registrableDomain(s.replyTo.split("@")[1] ?? "");
    if (replyDomain && replyDomain !== senderDomain) {
      out.push({ id: "reply-to", name: "Replies go somewhere else", status: "warn", detail: `It's sent from ${senderDomain}, but if you hit reply your answer goes to ${replyDomain}.` });
    }
  }
  return out;
}

async function dkimCheck(s: Suspect): Promise<CheckResult[]> {
  if (!s.originalRaw || !s.sender?.address) return [];
  const fromDomain = registrableDomain(s.sender.address.split("@")[1] ?? "");
  const res = await dkimVerify(Buffer.from(s.originalRaw));
  const id = "dkim";
  const name = "Digital signature";
  if (res.results.length === 0 || res.results.every((r) => r.status.result === "none")) {
    return [{ id, name, status: "warn", detail: `The email has no digital signature, so there's no proof it really came from ${fromDomain}.` }];
  }
  const passed = res.results.filter((r) => r.status.result === "pass");
  const aligned = passed.find((r) => r.signingDomain && registrableDomain(r.signingDomain) === fromDomain);
  if (aligned) {
    return [{ id, name, status: "pass", detail: `We checked the email's digital signature: it really was sent by ${fromDomain}, and wasn't changed on the way.`, data: { signedBy: aligned.signingDomain } }];
  }
  if (passed.length > 0) {
    const by = passed.map((r) => r.signingDomain).join(", ");
    return [{ id, name, status: "warn", detail: `The email is signed by ${by}, not by ${fromDomain} which it claims to be from.` }];
  }
  return [{ id, name, status: "fail", detail: `The email's digital signature doesn't check out: it may be forged or changed after sending.` }];
}

function agentboxdCheck(s: Suspect): CheckResult[] {
  if (s.agentboxdRisk === undefined) return [];
  const pct = Math.round(s.agentboxdRisk * 100);
  const status = s.agentboxdRisk >= 0.8 ? "fail" : s.agentboxdRisk >= 0.5 ? "warn" : "pass";
  return [{ id: "agentboxd-screen", name: "Mail server phishing screen", status, detail: `Our mail provider's phishing screen rated this ${pct}% likely to be phishing.`, data: { risk: s.agentboxdRisk } }];
}

async function safeBrowsingCheck(urls: string[]): Promise<CheckResult[]> {
  const key = process.env.SAFE_BROWSING_API_KEY;
  if (!key || urls.length === 0) return [];
  const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client: { clientId: "second-look", clientVersion: "0.1" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: urls.map((url) => ({ url })),
      },
    }),
  });
  if (!res.ok) throw new Error(`Safe Browsing returned ${res.status}`);
  const body = (await res.json()) as { matches?: { threat: { url: string }; threatType: string }[] };
  if (body.matches?.length) {
    const hit = body.matches[0];
    return [{ id: "safe-browsing", name: "Known dangerous link", status: "fail", detail: `Google Safe Browsing lists ${hostnameOf(hit.threat.url)} as dangerous (${hit.threatType.toLowerCase().replace(/_/g, " ")}).` }];
  }
  return [{ id: "safe-browsing", name: "Known dangerous link", status: "pass", detail: "None of the links are on Google's list of known dangerous sites (new scam sites often aren't listed yet)." }];
}

/** Runs one check group; a failure or timeout becomes an "unknown" result instead of breaking the run. */
async function guarded(name: string, fn: () => Promise<CheckResult[]> | CheckResult[]): Promise<CheckResult[]> {
  try {
    return await withTimeout(Promise.resolve(fn()), CHECK_TIMEOUT_MS, name);
  } catch (e) {
    return [{ id: `error:${name}`, name, status: "unknown", detail: `This check couldn't run: ${(e as Error).message}.` }];
  }
}

export async function runChecks(s: Suspect): Promise<{ checks: CheckResult[]; links: TracedLink[] }> {
  const links = await traceAll(extractLinks(s.text, s.html));
  const hosts = [...new Set(links.flatMap((l) => [l.host, l.finalHost]).filter((h): h is string => !!h))];
  const groups = await Promise.all([
    guarded("links", () => linkChecks(links)),
    guarded("lookalike", () => impersonationChecks(hosts)),
    guarded("domain-age", () => ageChecks(hosts)),
    guarded("brand-links", () => brandMismatchCheck(s, hosts)),
    guarded("sender", () => senderChecks(s)),
    guarded("dkim", () => dkimCheck(s)),
    guarded("agentboxd", () => agentboxdCheck(s)),
    guarded("safe-browsing", () => safeBrowsingCheck(links.map((l) => l.trace.finalUrl))),
  ]);
  return { checks: groups.flat(), links };
}
