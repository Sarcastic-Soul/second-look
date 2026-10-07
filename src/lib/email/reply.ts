import { parse } from "tldts";
import { officialBrandFor } from "../checks/brands";
import type { Analysis } from "../pipeline";
import type { CheckStatus } from "../types";

// Plain, table-free HTML with inline styles: it has to look right in Gmail, Outlook and phone mail apps.

const VERDICT_STYLE = {
  scam: { label: "Scam", colour: "#b42318", background: "#fef3f2" },
  suspicious: { label: "Be careful", colour: "#9a6700", background: "#fff8e6" },
  safe: { label: "Looks safe", colour: "#1a7f37", background: "#effaf1" },
} as const;

const STATUS_MARK: Record<CheckStatus, string> = { pass: "OK", warn: "Warning", fail: "Problem", unknown: "Couldn't tell" };

const FOOTER =
  "Second Look is an automated helper and can be wrong. If money or passwords are involved, check with the company directly using a number or website you already trust.";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/gi;

/**
 * Writes suspicious website names as "site[.]com". Mail apps then can't turn them into links someone
 * might tap, and spam filters don't mistake our reply for the scam it describes. Real company sites
 * stay as they are.
 */
export function defang(s: string): string {
  return s.replace(DOMAIN_RE, (d) => {
    const p = parse(d);
    if (!p.domain || !p.isIcann || officialBrandFor(d.toLowerCase())) return d;
    return d.replace(/\./g, "[.]");
  });
}

/** Sent as a reply in the person's thread, so it keeps their subject ("Re: ...") and only the body is rendered. */
export interface ReplyContent {
  text: string;
  html: string;
}

const SAFE_NOTE = "Suspicious website names are written like example[.]com so they can't be clicked by accident.";

export function renderVerdictReply(analysis: Analysis, reportUrl?: string): ReplyContent {
  const a = defangAnalysis(analysis);
  const v = a.verdict;
  const style = VERDICT_STYLE[v.verdict];
  const confidence = Math.round(v.confidence * 100);
  const shown = a.checks.filter((c) => c.status !== "unknown");

  const text = [
    `${style.label.toUpperCase()} (${confidence}% sure)`,
    v.headline,
    a.degraded ? "\nOur AI was unavailable, so this answer comes only from the technical checks." : "",
    v.redFlags.length ? `\nWhy:\n${v.redFlags.map((f) => `- ${f.title}: ${f.explanation}${f.quote ? ` ("${f.quote}")` : ""}`).join("\n")}` : "",
    v.goodSigns.length ? `\nGood signs:\n${v.goodSigns.map((g) => `- ${g.title}: ${g.explanation}`).join("\n")}` : "",
    v.nextSteps.length ? `\nWhat to do:\n${v.nextSteps.map((s) => `- ${s}`).join("\n")}` : "",
    shown.length ? `\nWhat we checked:\n${shown.map((c) => `- [${STATUS_MARK[c.status]}] ${c.detail}`).join("\n")}` : "",
    reportUrl ? `\nFull report: ${reportUrl}` : "",
    `\n--\n${SAFE_NOTE}\n${FOOTER}`,
  ]
    .filter(Boolean)
    .join("\n");

  const list = (items: string[]) =>
    items.length ? `<ul style="margin:8px 0 16px;padding-left:20px">${items.map((i) => `<li style="margin:0 0 8px">${i}</li>`).join("")}</ul>` : "";
  const heading = (s: string) => `<p style="margin:16px 0 4px;font-weight:600">${esc(s)}</p>`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2328;max-width:560px">
<div style="background:${style.background};border:1px solid ${style.colour}33;border-radius:8px;padding:12px 16px;margin:0 0 16px">
<p style="margin:0;font-size:20px;font-weight:700;color:${style.colour}">${esc(style.label)} <span style="font-size:14px;font-weight:400;color:#57606a">(${confidence}% sure)</span></p>
<p style="margin:4px 0 0">${esc(v.headline)}</p>
</div>
${a.degraded ? `<p style="color:#57606a;font-size:14px">Our AI was unavailable, so this answer comes only from the technical checks.</p>` : ""}
${v.redFlags.length ? heading("Why") + list(v.redFlags.map((f) => `<strong>${esc(f.title)}.</strong> ${esc(f.explanation)}${f.quote ? `<br><span style="color:#57606a">"${esc(f.quote)}"</span>` : ""}`)) : ""}
${v.goodSigns.length ? heading("Good signs") + list(v.goodSigns.map((g) => `<strong>${esc(g.title)}.</strong> ${esc(g.explanation)}`)) : ""}
${v.nextSteps.length ? heading("What to do") + list(v.nextSteps.map(esc)) : ""}
${shown.length ? heading("What we checked") + list(shown.map((c) => `<span style="color:#57606a">[${STATUS_MARK[c.status]}]</span> ${esc(c.detail)}`)) : ""}
${reportUrl ? `<p><a href="${esc(reportUrl)}" style="color:#0b5cad">See the full report</a></p>` : ""}
<p style="margin-top:24px;border-top:1px solid #d0d7de;padding-top:12px;font-size:13px;color:#57606a">${esc(SAFE_NOTE)} ${esc(FOOTER)}</p>
</div>`;

  return { text, html };
}

export function defangAnalysis(a: Analysis): Analysis {
  const ev = <T extends { title: string; explanation: string; quote?: string }>(e: T): T => ({
    ...e,
    title: defang(e.title),
    explanation: defang(e.explanation),
    quote: e.quote ? defang(e.quote) : e.quote,
  });
  return {
    ...a,
    checks: a.checks.map((c) => ({ ...c, detail: defang(c.detail) })),
    verdict: {
      ...a.verdict,
      headline: defang(a.verdict.headline),
      redFlags: a.verdict.redFlags.map(ev),
      goodSigns: a.verdict.goodSigns.map(ev),
      nextSteps: a.verdict.nextSteps.map(defang),
    },
  };
}

const HOW_TO =
  "Forward the suspicious email to this address, or attach a screenshot of the text message. For the most accurate check, use \"Forward as attachment\" so we can see the original email's digital signature.";

export function renderHowToReply(): ReplyContent {
  const text = `We couldn't find a message to check in your email.\n\n${HOW_TO}\n\n--\n${FOOTER}`;
  return {
    text,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2328;max-width:560px"><p>We couldn't find a message to check in your email.</p><p>${esc(HOW_TO)}</p><p style="margin-top:24px;font-size:13px;color:#57606a">${esc(FOOTER)}</p></div>`,
  };
}

export function renderFailureReply(): ReplyContent {
  const body =
    "Sorry, something went wrong while checking this message, so we can't give you an answer right now. Until you know more, treat it as suspicious: don't click its links, don't reply, and don't share codes or passwords. You can try forwarding it again in a few minutes.";
  return {
    text: `${body}\n\n--\n${FOOTER}`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2328;max-width:560px"><p>${esc(body)}</p><p style="margin-top:24px;font-size:13px;color:#57606a">${esc(FOOTER)}</p></div>`,
  };
}
