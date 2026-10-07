import { runChecks } from "./checks";
import { readScreenshot } from "./ai/read-image";
import { judge, ruleVerdict, type Verdict } from "./ai/verdict";
import type { CheckResult, Suspect } from "./types";

export interface Analysis {
  suspect: Omit<Suspect, "images" | "originalRaw" | "html"> & { imageCount: number };
  checks: CheckResult[];
  verdict: Verdict;
  /** True when the LLM failed and the verdict came from the checks alone. */
  degraded: boolean;
  timings: Record<string, number>;
}

async function timed<T>(timings: Record<string, number>, key: string, fn: () => Promise<T>): Promise<T> {
  const t = performance.now();
  try {
    return await fn();
  } finally {
    timings[key] = Math.round(performance.now() - t);
  }
}

/** Screenshots become text first, so every later step works the same for images and emails. */
async function readImages(s: Suspect, timings: Record<string, number>): Promise<Suspect> {
  if (s.images.length === 0) return s;
  const readings = await timed(timings, "readImages", () => Promise.all(s.images.map(readScreenshot)));
  const text = [s.text, ...readings.map((r) => r.text)].filter((t) => t.trim()).join("\n\n");
  const shownSender = readings.find((r) => r.sender)?.sender ?? undefined;
  return { ...s, text, sender: s.sender ?? (shownSender ? { name: shownSender } : undefined) };
}

export async function analyse(input: Suspect): Promise<Analysis> {
  const timings: Record<string, number> = {};
  const started = performance.now();
  const s = await readImages(input, timings);
  const { checks } = await timed(timings, "checks", () => runChecks(s));

  let verdict: Verdict;
  let degraded = false;
  try {
    verdict = await timed(timings, "verdict", () => judge(s, checks));
  } catch (e) {
    degraded = true;
    const rv = ruleVerdict(checks);
    verdict = {
      ...rv,
      scamType: "other",
      headline: "Our AI was unavailable, so this verdict is based only on the technical checks below.",
      redFlags: checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => ({ title: c.name, explanation: c.detail, checkId: c.id })),
      goodSigns: checks.filter((c) => c.status === "pass").map((c) => ({ title: c.name, explanation: c.detail, checkId: c.id })),
      nextSteps: ["Don't click links or reply until you've checked with the company directly, using a number or website you already trust."],
      droppedClaims: 0,
      model: `rules (${(e as Error).message.slice(0, 120)})`,
    };
  }
  timings.total = Math.round(performance.now() - started);

  const { images, originalRaw, html, ...rest } = s;
  void originalRaw;
  void html;
  return { suspect: { ...rest, imageCount: images.length }, checks, verdict, degraded, timings };
}
