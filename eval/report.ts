// Reads eval/results.jsonl and writes eval/RESULTS.md: precision, recall, false alarms and a
// confusion table for each setup, plus the cases the shipped setup got wrong.
import { readFileSync, writeFileSync } from "node:fs";
import type { Row } from "./run";

const HERE = new URL(".", import.meta.url).pathname;
const texts = new Map(
  readFileSync(`${HERE}sample.jsonl`, "utf8").trim().split("\n").map((l) => {
    const i = JSON.parse(l) as { id: string; text: string };
    return [i.id, i.text] as const;
  }),
);
// The last answer per message and setup wins, so a rerun after an error replaces it.
const latest = new Map<string, Row>();
for (const l of readFileSync(`${HERE}results.jsonl`, "utf8").trim().split("\n")) {
  const r = JSON.parse(l) as Row;
  latest.set(`${r.id}:${r.mode}`, r);
}
const rows = [...latest.values()];
const MODES = ["checks-only", "llm-only", "llm+checks"] as const;

const pct = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : "n/a");

function score(rs: Row[], flagged: (r: Row) => boolean) {
  const ok = rs.filter((r) => !r.error);
  const tp = ok.filter((r) => r.label === "scam" && flagged(r)).length;
  const fn = ok.filter((r) => r.label === "scam" && !flagged(r)).length;
  const fp = ok.filter((r) => r.label === "ham" && flagged(r)).length;
  const tn = ok.filter((r) => r.label === "ham" && !flagged(r)).length;
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  return { tp, fn, fp, tn, precision, recall, f1: (2 * precision * recall) / (precision + recall), falseAlarm: fp / (fp + tn), errors: rs.length - ok.length };
}

const lines: string[] = [];
const total = new Set(rows.map((r) => r.id)).size;
lines.push(`# Evaluation results`, ``, `${total} text messages: ${rows.filter((r) => r.mode === "llm+checks" && r.label === "scam").length} scams and ${rows.filter((r) => r.mode === "llm+checks" && r.label === "ham").length} ordinary messages. See eval/README.md for the dataset and method.`, ``);

for (const [title, flagged] of [
  ["Counting \"Scam\" or \"Be careful\" as a warning", (r: Row) => r.verdict === "scam" || r.verdict === "suspicious"],
  ["Counting only \"Scam\" as a warning", (r: Row) => r.verdict === "scam"],
] as const) {
  lines.push(`## ${title}`, ``, `| Setup | Precision | Recall | F1 | False alarms on ordinary texts | Errors |`, `| --- | --- | --- | --- | --- | --- |`);
  for (const m of MODES) {
    const s = score(rows.filter((r) => r.mode === m), flagged);
    lines.push(`| ${m} | ${pct(s.precision)} | ${pct(s.recall)} | ${pct(s.f1)} | ${pct(s.falseAlarm)} (${s.fp}/${s.fp + s.tn}) | ${s.errors} |`);
  }
  lines.push(``);
}

lines.push(`## Verdicts by setup`, ``, `| Setup | Label | Scam | Be careful | Looks safe |`, `| --- | --- | --- | --- | --- |`);
for (const m of MODES)
  for (const label of ["scam", "ham"] as const) {
    const rs = rows.filter((r) => r.mode === m && r.label === label && !r.error);
    const c = (v: string) => rs.filter((r) => r.verdict === v).length;
    lines.push(`| ${m} | ${label} | ${c("scam")} | ${c("suspicious")} | ${c("safe")} |`);
  }
lines.push(``);

const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
lines.push(`## Time per message (median)`, ``);
for (const m of MODES) lines.push(`- ${m}: ${(median(rows.filter((r) => r.mode === m && !r.error).map((r) => r.ms)) / 1000).toFixed(1)} s`);
lines.push(``);

const wrong = rows.filter((r) => r.mode === "llm+checks" && !r.error && ((r.label === "scam" && r.verdict === "safe") || (r.label === "ham" && r.verdict !== "safe")));
lines.push(`## Where the shipped setup (llm+checks) was wrong`, ``);
if (wrong.length === 0) lines.push(`None.`);
for (const r of wrong) {
  const t = (texts.get(r.id) ?? "").replace(/\s+/g, " ");
  lines.push(`- **${r.id}**, labelled ${r.label}, we said ${r.verdict}: "${t.length > 220 ? `${t.slice(0, 220)}...` : t}"`);
}
lines.push(``);

writeFileSync(`${HERE}RESULTS.md`, lines.join("\n"));
console.log(lines.join("\n"));
