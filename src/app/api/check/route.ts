import { and, count, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashRequester } from "@/lib/email/handle-inbound";
import { InputError, suspectFromWebForm } from "@/lib/ingest/web";
import { analyse } from "@/lib/pipeline";

export const maxDuration = 60;

/** Checks one visitor can run per hour. Each one costs LLM calls, so this caps abuse of the free tier. */
const HOURLY_LIMIT = Number(process.env.WEB_HOURLY_LIMIT ?? 20);

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const requesterHash = hashRequester(`ip:${clientIp(request)}`);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ n }] = await db()
    .select({ n: count() })
    .from(schema.checks)
    .where(and(eq(schema.checks.requesterHash, requesterHash), gt(schema.checks.createdAt, hourAgo)));
  if (n >= HOURLY_LIMIT) {
    return Response.json({ error: "You've checked a lot of messages in the last hour. Please try again a bit later." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Couldn't read the form." }, { status: 400 });
  }

  try {
    const suspect = await suspectFromWebForm(form);
    const analysis = await analyse(suspect);
    const [row] = await db()
      .insert(schema.checks)
      .values({
        source: "web",
        requesterHash,
        status: "done",
        channel: analysis.suspect.channel,
        verdict: analysis.verdict.verdict,
        confidence: analysis.verdict.confidence,
        scamType: analysis.verdict.scamType,
        analysis,
        totalMs: analysis.timings.total,
      })
      .returning({ id: schema.checks.id });
    return Response.json({ id: row.id, analysis });
  } catch (e) {
    if (e instanceof InputError) return Response.json({ error: e.message }, { status: 400 });
    console.error(`[check] failed: ${(e as Error).message}`);
    return Response.json({ error: "Something went wrong while checking this message. Please try again." }, { status: 500 });
  }
}
