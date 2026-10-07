import { createHash } from "node:crypto";
import type { Message, WebhookEvent } from "agentboxd";
import { and, count, eq, gt } from "drizzle-orm";
import { agentboxd, fetchRawMessage, phishingRisk } from "../agentboxd";
import { db, schema } from "../db";
import { suspectFromRawEmail, parseSenderLine } from "../ingest/email";
import { analyse } from "../pipeline";
import { renderFailureReply, renderHowToReply, renderVerdictReply, type ReplyContent } from "./reply";

/** Checks one person can ask for per hour. Each one costs LLM calls, so this caps abuse of the free tier. */
const HOURLY_LIMIT = Number(process.env.EMAIL_HOURLY_LIMIT ?? 10);

export type InboundOutcome =
  | { action: "ignored"; reason: string }
  | { action: "replied"; checkId: string; kind: "verdict" | "how-to" | "failure" };

export function hashRequester(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Mail we must never answer: our own sends, bounces and auto-replies. Answering those can start a loop
 * where two robots email each other forever.
 */
function loopReason(m: Message, from: string, inboxAddress: string): string | null {
  if (m.direction !== "inbound") return "not inbound";
  if (from === inboxAddress.toLowerCase()) return "sent by us";
  if (/^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounces?)[@+]/i.test(from)) return "automated sender";
  const header = (name: string) => {
    const v = m.headers[name] ?? m.headers[name.toLowerCase()];
    return (Array.isArray(v) ? v[0] : v)?.toLowerCase();
  };
  const auto = header("auto-submitted");
  if (auto && auto !== "no") return `auto-submitted: ${auto}`;
  if (header("x-autoreply") || header("x-autorespond")) return "auto-reply";
  if (["auto_reply", "bulk", "junk", "list"].includes(header("precedence") ?? "")) return "bulk or auto-reply";
  return null;
}

function reportUrl(checkId: string): string | undefined {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  return base ? `${base}/r/${checkId}` : undefined;
}

export async function handleInbound(event: WebhookEvent): Promise<InboundOutcome> {
  if (event.type !== "message.received") return { action: "ignored", reason: `event ${event.type}` };
  const { message: m, inbox } = event.data;
  const from = parseSenderLine(m.from)?.address;
  if (!from) return { action: "ignored", reason: "no sender address" };
  const loop = loopReason(m, from, inbox.address);
  if (loop) return { action: "ignored", reason: loop };

  const requesterHash = hashRequester(from);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ n }] = await db()
    .select({ n: count() })
    .from(schema.checks)
    .where(and(eq(schema.checks.requesterHash, requesterHash), gt(schema.checks.createdAt, hourAgo)));
  if (n >= HOURLY_LIMIT) return { action: "ignored", reason: "rate limited" };

  // Claim the message first: Agentboxd may deliver the same webhook twice, and only one should reply.
  const [row] = await db()
    .insert(schema.checks)
    .values({ source: "email", messageId: m.id, requesterHash })
    .onConflictDoNothing({ target: schema.checks.messageId })
    .returning({ id: schema.checks.id });
  if (!row) return { action: "ignored", reason: "already handled" };

  const reply = async (content: ReplyContent) => {
    // Dry run: log the reply instead of sending it, for local testing against real inbox messages.
    if (process.env.DRY_RUN === "1") return void console.log(`[inbound] DRY RUN reply to ${m.id}:\n${content.text}`);
    await agentboxd().messages.send(inbox.id, { to: from, subject: content.subject, text: content.text, html: content.html, labels: ["second-look-reply"] });
  };

  try {
    const suspect = await suspectFromRawEmail(await fetchRawMessage(m.id), { agentboxdRisk: phishingRisk(m) });
    if (!suspect.text.trim() && suspect.images.length === 0) {
      await reply(renderHowToReply());
      await db().update(schema.checks).set({ status: "skipped", channel: suspect.channel }).where(eq(schema.checks.id, row.id));
      return { action: "replied", checkId: row.id, kind: "how-to" };
    }
    const analysis = await analyse(suspect);
    await db()
      .update(schema.checks)
      .set({
        status: "done",
        channel: analysis.suspect.channel,
        verdict: analysis.verdict.verdict,
        confidence: analysis.verdict.confidence,
        scamType: analysis.verdict.scamType,
        analysis,
        totalMs: analysis.timings.total,
      })
      .where(eq(schema.checks.id, row.id));
    await reply(renderVerdictReply(analysis, reportUrl(row.id), m.subject));
    return { action: "replied", checkId: row.id, kind: "verdict" };
  } catch (e) {
    const error = (e as Error).message.slice(0, 500);
    console.error(`[inbound] ${m.id} failed: ${error}`);
    await db().update(schema.checks).set({ status: "failed", error }).where(eq(schema.checks.id, row.id));
    await reply(renderFailureReply()).catch((re: Error) => console.error(`[inbound] ${m.id} failure reply failed: ${re.message}`));
    return { action: "replied", checkId: row.id, kind: "failure" };
  }
}
