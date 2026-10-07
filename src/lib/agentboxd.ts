import { Agentboxd, type Message } from "agentboxd";

let client: Agentboxd | null = null;
export function agentboxd(): Agentboxd {
  client ??= new Agentboxd();
  return client;
}

/** Full MIME source of a message. The SDK has no helper for this endpoint yet. */
export async function fetchRawMessage(messageId: string): Promise<Uint8Array> {
  const base = process.env.AGENTBOXD_BASE_URL ?? "https://api.agentboxd.com";
  const res = await fetch(`${base}/v1/messages/${messageId}/raw`, {
    headers: { authorization: `Bearer ${process.env.AGENTBOXD_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Agentboxd raw fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function phishingRisk(m: Message): number | undefined {
  return m.ai?.risk?.phishing;
}
