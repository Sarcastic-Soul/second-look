// Spike: waits for inbound mail and saves each full message JSON to a folder outside the repo,
// so we can see exactly what Agentboxd hands us for forwarded emails.
// Run: bun scripts/dump-inbound.ts <out-dir> [count]
import { Agentboxd } from "agentboxd";
import { mkdirSync, writeFileSync } from "node:fs";

const [outDir, countArg] = process.argv.slice(2);
if (!outDir) throw new Error("usage: bun scripts/dump-inbound.ts <out-dir> [count]");
mkdirSync(outDir, { recursive: true });

const mr = new Agentboxd();
const inbox = (await mr.inboxes.list()).data.find((i) => i.address.startsWith("secondlook@"));
if (!inbox) throw new Error("run scripts/setup-inbox.ts first");

const want = Number(countArg ?? 3);
let since = new Date().toISOString();
let got = 0;
const seen = new Set<string>();
console.log(`waiting on ${inbox.address} for ${want} message(s)...`);
while (got < want) {
  const msg = await mr.messages.wait(inbox.id, { timeout: 60, since });
  if (!msg || seen.has(msg.id)) continue;
  seen.add(msg.id);
  const full = await mr.messages.get(msg.id);
  since = full.created_at;
  writeFileSync(`${outDir}/${++got}-${msg.id}.json`, JSON.stringify(full, null, 2));
  console.log(`saved #${got}: from=${full.from} subject=${full.subject} labels=${full.labels.join(",")}`);
}
