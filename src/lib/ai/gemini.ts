import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { z } from "zod";

// Gemini through its OpenAI-compatible endpoint, so any OpenAI-compatible provider can be swapped in.
const BASE_URL = process.env.LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
// Short timeout: an overloaded model should hand over to the fallback quickly, not stall the reply.
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 15_000);

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new OpenAI({ apiKey, baseURL: BASE_URL, timeout: TIMEOUT_MS, maxRetries: 0 });
  }
  return client;
}

function models(fastFirst: boolean): string[] {
  const main = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const fast = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
  return (fastFirst ? [fast, main] : [main, fast]).filter((m, i, all) => all.indexOf(m) === i);
}

function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced ? fenced[1] : content).trim());
}

/**
 * Asks the model for JSON and validates it. Tries the main model, then the fallback, so one
 * overloaded model (503) or a malformed answer doesn't fail the whole check. `fastFirst` starts with the
 * lighter model, for simple jobs like copying text out of a screenshot.
 */
export async function generateJson<T>(
  schema: z.ZodType<T>,
  messages: ChatCompletionMessageParam[],
  opts: { fastFirst?: boolean } = {},
): Promise<{ data: T; model: string }> {
  const errors: string[] = [];
  for (const model of models(opts.fastFirst ?? false)) {
    try {
      const res = await getClient().chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const content = res.choices[0]?.message?.content ?? "";
      const parsed = schema.safeParse(extractJson(content));
      if (parsed.success) return { data: parsed.data, model };
      errors.push(`${model}: answer didn't match the schema (${parsed.error.issues[0]?.message})`);
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message}`);
    }
  }
  throw new Error(`LLM failed: ${errors.join(" | ")}`);
}

export function imagePart(mimeType: string, data: Uint8Array): { type: "image_url"; image_url: { url: string } } {
  return { type: "image_url", image_url: { url: `data:${mimeType};base64,${Buffer.from(data).toString("base64")}` } };
}
