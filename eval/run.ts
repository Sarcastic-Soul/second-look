// Runs every message in eval/sample.jsonl through three setups and appends the answers to
// eval/results.jsonl:
//   checks-only  the technical checks with a simple rule, no AI
//   llm-only     the AI reading the message alone
//   llm+checks   the AI with the check results (what Second Look ships)
// Resumable: rows already in results.jsonl are skipped. Run: bun run eval
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { judge, ruleVerdict } from "../src/lib/ai/verdict";
import { runChecks } from "../src/lib/checks";
import { suspectFromWebForm } from "../src/lib/ingest/web";

const HERE = new URL(".", import.meta.url).pathname;
const SAMPLE = `${HERE}sample.jsonl`;
const RESULTS = `${HERE}results.jsonl`;
// Gap between AI calls, to stay under the free tier's requests-per-minute limit.
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 4000);

type Mode = "checks-only" | "llm-only" | "llm+checks";
interface Item {
  id: string;
  label: "scam" | "ham";
  text: string;
}
export interface Row {
  id: string;
  label: Item["label"];
  mode: Mode;
  verdict?: "scam" | "suspicious" | "safe";
  confidence?: number;
  model?: string;
  failedChecks?: string[];
  ms: number;
  error?: string;
}

const items: Item[] = readFileSync(SAMPLE, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const done = new Set(
  existsSync(RESULTS)
    ? readFileSync(RESULTS, "utf8").trim().split("\n").filter(Boolean).map((l) => {
        const r = JSON.parse(l) as Row;
        return r.error ? "" : `${r.id}:${r.mode}`;
      })
    : [],
);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const save = (row: Row) => appendFileSync(RESULTS, JSON.stringify(row) + "\n");

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await sleep(30_000);
    return fn();
  }
}

let n = 0;
for (const item of items) {
  n++;
  const todo = (["checks-only", "llm-only", "llm+checks"] as Mode[]).filter((m) => !done.has(`${item.id}:${m}`));
  if (todo.length === 0) continue;

  const form = new FormData();
  form.set("text", item.text);
  const s = await suspectFromWebForm(form);
  const t0 = performance.now();
  const { checks } = await runChecks(s);
  const checksMs = Math.round(performance.now() - t0);
  const flagged = checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => c.id);

  for (const mode of todo) {
    const base = { id: item.id, label: item.label, mode };
    if (mode === "checks-only") {
      save({ ...base, ...ruleVerdict(checks), failedChecks: flagged, ms: checksMs });
      continue;
    }
    const t = performance.now();
    try {
      const v = await withRetry(() => judge(s, mode === "llm+checks" ? checks : null));
      const ms = Math.round(performance.now() - t) + (mode === "llm+checks" ? checksMs : 0);
      save({ ...base, verdict: v.verdict, confidence: v.confidence, model: v.model, failedChecks: mode === "llm+checks" ? flagged : undefined, ms });
    } catch (e) {
      save({ ...base, ms: Math.round(performance.now() - t), error: (e as Error).message.slice(0, 300) });
    }
    await sleep(DELAY_MS);
  }
  console.log(`${n}/${items.length} ${item.id} (${item.label})`);
}
console.log("done");
