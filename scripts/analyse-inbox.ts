// Runs the full pipeline on messages already in the inbox and prints the result. Sends nothing.
// Run: bun scripts/analyse-inbox.ts [count=5] [--json]
import { agentboxd, fetchRawMessage, phishingRisk } from "../src/lib/agentboxd";
import { suspectFromRawEmail } from "../src/lib/ingest/email";
import { analyse } from "../src/lib/pipeline";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 5);

const mr = agentboxd();
const inbox = (await mr.inboxes.list()).data.find((i) => i.address.startsWith("secondlook@"));
if (!inbox) throw new Error("run scripts/setup-inbox.ts first");

const ICON = { pass: "✓", warn: "!", fail: "✗", unknown: "?" } as const;

for (const m of (await mr.messages.list(inbox.id, { limit: count })).data) {
  const full = await mr.messages.get(m.id);
  const suspect = await suspectFromRawEmail(await fetchRawMessage(m.id), { agentboxdRisk: phishingRisk(full) });
  const a = await analyse(suspect);
  if (asJson) {
    console.log(JSON.stringify(a, null, 2));
    continue;
  }
  const v = a.verdict;
  console.log(`\n=== ${full.subject ?? "(no subject)"}  [${a.suspect.channel}]`);
  console.log(`sender: ${a.suspect.sender?.name ?? ""} <${a.suspect.sender?.address ?? "?"}>  images: ${a.suspect.imageCount}`);
  console.log(`VERDICT: ${v.verdict.toUpperCase()} (${Math.round(v.confidence * 100)}%, ${v.scamType}) via ${v.model}${a.degraded ? " [DEGRADED]" : ""}`);
  console.log(`  ${v.headline}`);
  for (const f of v.redFlags) console.log(`  red flag: ${f.title}: ${f.explanation}  [${f.checkId ?? `"${f.quote}"`}]`);
  for (const g of v.goodSigns) console.log(`  good: ${g.title}: ${g.explanation}`);
  for (const s of v.nextSteps) console.log(`  next: ${s}`);
  if (v.droppedClaims) console.log(`  (dropped ${v.droppedClaims} unsupported claim(s))`);
  console.log("  checks:");
  for (const c of a.checks) console.log(`    ${ICON[c.status]} ${c.id}: ${c.detail}`);
  console.log(`  timings: ${JSON.stringify(a.timings)}`);
}
