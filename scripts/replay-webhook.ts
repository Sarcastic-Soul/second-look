// Sends a signed message.received webhook for a message already in the inbox to a running app, the same
// way Agentboxd would. Start the app with the same AGENTBOXD_WEBHOOK_SECRET (and DRY_RUN=1 to not send).
// Run: bun scripts/replay-webhook.ts [index=0] [--fresh] [--url=http://localhost:3000/api/inbound]
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { agentboxd } from "../src/lib/agentboxd";
import { db, schema } from "../src/lib/db";

const args = process.argv.slice(2);
const index = Number(args.find((a) => /^\d+$/.test(a)) ?? 0);
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:3000/api/inbound";
const secret = process.env.AGENTBOXD_WEBHOOK_SECRET;
if (!secret) throw new Error("AGENTBOXD_WEBHOOK_SECRET is not set");

const mr = agentboxd();
const inbox = (await mr.inboxes.list()).data.find((i) => i.address.startsWith("secondlook@"));
if (!inbox) throw new Error("run scripts/setup-inbox.ts first");
const listed = (await mr.messages.list(inbox.id, { limit: index + 1 })).data[index];
if (!listed) throw new Error(`no message at index ${index}`);
const message = await mr.messages.get(listed.id);

// --fresh forgets the earlier answer, so the same message can be replayed.
if (args.includes("--fresh")) await db().delete(schema.checks).where(eq(schema.checks.messageId, message.id));

const body = JSON.stringify({
  id: `evt_replay_${Date.now()}`,
  type: "message.received",
  created_at: new Date().toISOString(),
  data: { inbox, thread_id: message.thread_id, message },
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex");
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", "x-mailroom-signature": signature, "x-mailroom-timestamp": timestamp },
  body,
});
console.log(`${message.subject ?? "(no subject)"}: ${res.status} ${await res.text()}`);
