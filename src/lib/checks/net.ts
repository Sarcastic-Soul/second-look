import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HOPS = 5;
const HOP_TIMEOUT_MS = 4_000;
const UA = "Mozilla/5.0 (compatible; SecondLookBot/0.1; +https://github.com/Sarcastic-Soul/second-look)";

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return isPrivateIPv4(v.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v);
}

/**
 * Refuses hosts that resolve to private, loopback or link-local addresses, so a scammer's link
 * can't make our server call into its own network. (DNS could still change between this check and
 * the request; acceptable for a demo, noted in the README.)
 */
async function assertPublicHost(hostname: string): Promise<void> {
  const ips = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (ips.length === 0) throw new Error("no DNS records");
  for (const { address } of ips) {
    if (isIP(address) === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)) {
      throw new Error(`refusing private address ${address}`);
    }
  }
}

export interface RedirectTrace {
  chain: string[];
  finalUrl: string;
  /** HTTP status of the last hop, if we got that far. */
  status?: number;
  error?: string;
}

/**
 * Follows a link's redirects one hop at a time without loading the page: no body is read and
 * no scripts run. Answers "where does this short link really go?"
 */
export async function traceRedirects(url: string): Promise<RedirectTrace> {
  const chain = [url];
  let current = url;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let u: URL;
    try {
      u = new URL(current);
      if (u.protocol !== "http:" && u.protocol !== "https:") return { chain, finalUrl: current, error: "not a web link" };
      await assertPublicHost(u.hostname);
    } catch (e) {
      return { chain, finalUrl: current, error: (e as Error).message };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HOP_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": UA, accept: "text/html,*/*;q=0.5" },
      });
      await res.body?.cancel().catch(() => {});
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        chain.push(current);
        continue;
      }
      return { chain, finalUrl: current, status: res.status };
    } catch (e) {
      const msg = (e as Error).name === "AbortError" ? "timed out" : (e as Error).message;
      return { chain, finalUrl: current, error: msg };
    } finally {
      clearTimeout(timer);
    }
  }
  return { chain, finalUrl: current, error: "too many redirects" };
}

export interface DomainAge {
  domain: string;
  registered?: Date;
  ageDays?: number;
  /** RDAP says the domain doesn't exist (not registered, or already taken down). */
  notFound?: boolean;
  error?: string;
}

const ageCache = new Map<string, DomainAge>();

/** Registration date from RDAP (the modern, free replacement for WHOIS). */
export async function domainAge(domain: string): Promise<DomainAge> {
  const cached = ageCache.get(domain);
  if (cached) return cached;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6_000);
  let result: DomainAge;
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: ctrl.signal,
      headers: { accept: "application/rdap+json, application/json" },
    });
    if (res.status === 404) {
      result = { domain, notFound: true };
    } else if (!res.ok) {
      result = { domain, error: `RDAP returned ${res.status}` };
    } else {
      const body = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
      const reg = body.events?.find((e) => e.eventAction === "registration")?.eventDate;
      if (!reg) {
        result = { domain, error: "no registration date published" };
      } else {
        const registered = new Date(reg);
        result = { domain, registered, ageDays: Math.floor((Date.now() - registered.getTime()) / 86_400_000) };
      }
    }
  } catch (e) {
    result = { domain, error: (e as Error).name === "AbortError" ? "RDAP timed out" : (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
  if (!result.error) ageCache.set(domain, result);
  return result;
}
