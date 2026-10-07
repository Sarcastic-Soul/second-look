import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRightIcon, CheckCircleIcon, QuestionIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react/ssr";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { defang, defangAnalysis } from "@/lib/email/reply";
import { getReport } from "@/lib/reports";
import type { Channel, CheckResult, CheckStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Your report",
  // Report links are private to whoever got them.
  robots: { index: false, follow: false },
};

const VERDICT = {
  scam: { label: "Scam", text: "text-scam", soft: "bg-scam-soft" },
  suspicious: { label: "Be careful", text: "text-warn", soft: "bg-warn-soft" },
  safe: { label: "Looks safe", text: "text-ok", soft: "bg-ok-soft" },
} as const;

const STATUS: Record<CheckStatus, { label: string; icon: typeof XCircleIcon; colour: string }> = {
  fail: { label: "Problem", icon: XCircleIcon, colour: "text-scam" },
  warn: { label: "Warning", icon: WarningIcon, colour: "text-warn" },
  pass: { label: "OK", icon: CheckCircleIcon, colour: "text-ok" },
  unknown: { label: "Couldn't tell", icon: QuestionIcon, colour: "text-ink-2" },
};

const CHANNEL: Record<Channel, string> = {
  "email-forward": "a forwarded email",
  "email-attachment": "an email forwarded as an attachment",
  "email-direct": "an email",
  screenshot: "a screenshot",
  web: "text pasted on this site",
};

const STATUS_ORDER: CheckStatus[] = ["fail", "warn", "pass", "unknown"];

export default function ReportPage({ params }: PageProps<"/r/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1160px] px-4 pt-2 pb-20 md:pt-6">
        <Suspense fallback={<ReportSkeleton />}>{params.then(({ id }) => <Report id={id} />)}</Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Report({ id }: { id: string }) {
  const report = await getReport(id);
  if (!report) notFound();

  const a = defangAnalysis(report.analysis);
  const v = a.verdict;
  const style = VERDICT[v.verdict];
  const checkName = new Map(a.checks.map((c) => [c.id, c.name]));
  const checks = [...a.checks].sort((x, y) => STATUS_ORDER.indexOf(x.status) - STATUS_ORDER.indexOf(y.status));
  const date = report.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const seconds = ((a.timings.total ?? 0) / 1000).toFixed(1);

  return (
    <article>
      <header className={`rounded-[22px] px-5 py-7 md:rounded-[28px] md:px-12 md:py-12 ${style.soft}`}>
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className={`font-display text-[56px] leading-none font-bold tracking-[-0.03em] md:text-[88px] ${style.text}`}>
            {style.label}
          </span>
          <span className="text-lg font-bold text-ink-2">{Math.round(v.confidence * 100)}% sure</span>
        </p>
        <h1 className="mt-4 max-w-[30ch] text-[22px] leading-snug font-bold md:text-[28px]">{v.headline}</h1>
        <p className="mt-4 text-sm text-ink-2 md:text-base">
          Checked on {date}, from {CHANNEL[a.suspect.channel]}, in {seconds} seconds.
        </p>
        {a.degraded && (
          <p className="mt-4 max-w-[60ch] rounded-xl bg-surface px-4 py-3 text-base">
            Our AI was unavailable, so this answer comes only from the technical checks below.
          </p>
        )}
      </header>

      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-[7fr_5fr] md:gap-16">
        <div className="flex flex-col gap-12">
          {v.redFlags.length > 0 && (
            <section>
              <h2 className="mb-5 font-display text-[30px] leading-tight font-bold">Why</h2>
              <ul className="flex flex-col gap-6">
                {v.redFlags.map((f, i) => (
                  <li key={i} className="grid grid-cols-[28px_1fr] gap-x-3">
                    <XCircleIcon size={24} weight="fill" className="mt-0.5 text-scam" aria-hidden />
                    <div>
                      <h3 className="text-lg font-bold">{f.title}</h3>
                      <p className="mt-1 leading-relaxed text-ink-2">{f.explanation}</p>
                      {f.quote && (
                        <blockquote className="mt-3 rounded-xl bg-surface px-4 py-3 leading-relaxed">
                          &ldquo;{f.quote}&rdquo;
                        </blockquote>
                      )}
                      {f.checkId && checkName.has(f.checkId) && (
                        <p className="mt-2 text-sm text-ink-2">Found by the &ldquo;{checkName.get(f.checkId)}&rdquo; check.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {v.goodSigns.length > 0 && (
            <section>
              <h2 className="mb-5 font-display text-[30px] leading-tight font-bold">Good signs</h2>
              <ul className="flex flex-col gap-6">
                {v.goodSigns.map((g, i) => (
                  <li key={i} className="grid grid-cols-[28px_1fr] gap-x-3">
                    <CheckCircleIcon size={24} weight="fill" className="mt-0.5 text-ok" aria-hidden />
                    <div>
                      <h3 className="text-lg font-bold">{g.title}</h3>
                      <p className="mt-1 leading-relaxed text-ink-2">{g.explanation}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {v.nextSteps.length > 0 && (
            <section className="rounded-[22px] bg-band px-5 py-7 text-on-band md:px-8">
              <h2 className="mb-4 font-display text-[30px] leading-tight font-bold">What to do</h2>
              <ol className="flex flex-col gap-3">
                {v.nextSteps.map((s, i) => (
                  <li key={i} className="grid grid-cols-[32px_1fr] text-lg leading-relaxed">
                    <span className="font-display font-bold">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <Link
            href="/check"
            className="inline-flex items-center gap-2 self-start border-b-2 border-accent pb-0.5 text-lg font-bold transition-colors hover:text-accent"
          >
            Check another message
            <ArrowRightIcon size={18} weight="bold" aria-hidden />
          </Link>
        </div>

        <aside className="flex flex-col gap-10">
          <section>
            <h2 className="mb-4 font-display text-2xl font-bold">What we checked</h2>
            {checks.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {checks.map((c) => (
                  <CheckRow key={c.id} check={c} />
                ))}
              </ul>
            ) : (
              <p className="leading-relaxed text-ink-2">
                There were no links or sender details to look up, so this answer is based on the words of the message.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-bold">The message</h2>
            <div className="rounded-2xl border border-line bg-surface p-4 text-[15px]">
              {(a.suspect.sender?.name || a.suspect.sender?.address || a.suspect.subject) && (
                <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-line pb-3">
                  {(a.suspect.sender?.name || a.suspect.sender?.address) && (
                    <>
                      <dt className="text-ink-2">From</dt>
                      <dd className="font-bold break-words">
                        {[a.suspect.sender?.name, a.suspect.sender?.address && `<${a.suspect.sender.address}>`].filter(Boolean).join(" ")}
                      </dd>
                    </>
                  )}
                  {a.suspect.subject && (
                    <>
                      <dt className="text-ink-2">Subject</dt>
                      <dd className="font-bold break-words">{a.suspect.subject}</dd>
                    </>
                  )}
                </dl>
              )}
              <p className="max-h-96 overflow-auto leading-relaxed break-words whitespace-pre-wrap">{defang(a.suspect.text)}</p>
              {a.suspect.imageCount > 0 && (
                <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">
                  Read from {a.suspect.imageCount === 1 ? "your screenshot" : `your ${a.suspect.imageCount} screenshots`}.
                </p>
              )}
            </div>
            <p className="mt-3 text-sm text-ink-2">Website names that look suspicious are written like example[.]com so they can&rsquo;t be tapped.</p>
          </section>
        </aside>
      </div>
    </article>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  const s = STATUS[check.status];
  const Icon = s.icon;
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-3">
      <Icon size={22} weight="fill" className={`mt-0.5 ${s.colour}`} aria-hidden />
      <div>
        <p className="font-bold">
          {check.name} <span className={`text-sm font-bold ${s.colour}`}>{s.label}</span>
        </p>
        <p className="mt-0.5 leading-relaxed text-ink-2">{check.detail}</p>
      </div>
    </li>
  );
}

function ReportSkeleton() {
  return (
    <div className="motion-safe:animate-pulse" role="status" aria-label="Loading the report">
      <div className="rounded-[22px] bg-accent-soft px-5 py-7 md:rounded-[28px] md:px-12 md:py-12">
        <div className="h-14 w-48 rounded-xl bg-line md:h-20" />
        <div className="mt-5 h-6 w-3/4 rounded-lg bg-line" />
        <div className="mt-3 h-6 w-1/2 rounded-lg bg-line" />
      </div>
      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-[7fr_5fr] md:gap-16">
        <div className="space-y-4">
          <div className="h-8 w-24 rounded-lg bg-line" />
          <div className="h-4 w-full rounded bg-line" />
          <div className="h-4 w-5/6 rounded bg-line" />
          <div className="h-4 w-2/3 rounded bg-line" />
        </div>
        <div className="space-y-4">
          <div className="h-7 w-40 rounded-lg bg-line" />
          <div className="h-4 w-full rounded bg-line" />
          <div className="h-4 w-4/5 rounded bg-line" />
        </div>
      </div>
    </div>
  );
}
