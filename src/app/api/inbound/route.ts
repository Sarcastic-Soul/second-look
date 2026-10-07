import { verifyWebhook, type WebhookEvent } from "agentboxd";
import { after } from "next/server";
import { handleInbound } from "@/lib/email/handle-inbound";

// Analysis takes 5-30 seconds. We answer the webhook straight away and do the work in after(),
// so Agentboxd doesn't time out and send the same event again.
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.AGENTBOXD_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "webhook secret not configured" }, { status: 500 });

  const body = await request.text();
  const signature = request.headers.get("x-mailroom-signature") ?? "";
  const timestamp = request.headers.get("x-mailroom-timestamp") ?? "";
  if (!verifyWebhook(signature, timestamp, body, secret)) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as WebhookEvent;
  after(async () => {
    try {
      const outcome = await handleInbound(event);
      console.log(`[inbound] ${event.id}: ${JSON.stringify(outcome)}`);
    } catch (e) {
      console.error(`[inbound] ${event.id} crashed: ${(e as Error).message}`, (e as Error).cause);
    }
  });
  return Response.json({ ok: true });
}
