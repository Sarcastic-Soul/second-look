import PostalMime, { type Email, type Address } from "postal-mime";
import { cleanText, htmlToText } from "../text";
import type { ImageInput, Sender, Suspect } from "../types";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);
const MIN_IMAGE_BYTES = 2_000; // skips tracking pixels and tiny logos
const MAX_IMAGES = 3;

// Lines that start a forwarded block in Gmail, Outlook, Apple Mail and Yahoo.
const FORWARD_MARKERS = [
  /^-{5,}\s*Forwarded message\s*-{5,}\s*$/im,
  /^Begin forwarded message:\s*$/im,
  /^-{3,}\s*Original Message\s*-{3,}\s*$/im,
  /^_{10,}\s*$/m,
];
const FORWARD_HEADER = /^\s*\*?(From|Sent|Date|Subject|To|Cc|Reply-To)\*?:\s*(.*)$/i;

function toBytes(content: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof content === "string") return new TextEncoder().encode(content);
  return content instanceof Uint8Array ? content : new Uint8Array(content);
}

function firstMailbox(a: Address | Address[] | undefined): Sender | undefined {
  const one = Array.isArray(a) ? a[0] : a;
  if (!one) return undefined;
  if (one.group) return one.group[0] ? { name: one.group[0].name || undefined, address: one.group[0].address } : undefined;
  return { name: one.name || undefined, address: one.address };
}

/** "Name <a@b.com>", "Name [mailto:a@b.com]", or a bare address. */
export function parseSenderLine(value: string): Sender | undefined {
  const v = value.replace(/\*/g, "").trim();
  const angle = v.match(/^(.*?)\s*<([^>\s]+@[^>\s]+)>/);
  if (angle) return { name: angle[1].replace(/^"|"$/g, "").trim() || undefined, address: angle[2].toLowerCase() };
  const mailto = v.match(/^(.*?)\s*\[mailto:([^\]\s]+)\]/i);
  if (mailto) return { name: mailto[1].replace(/^"|"$/g, "").trim() || undefined, address: mailto[2].toLowerCase() };
  const bare = v.match(/[^\s<>"]+@[^\s<>"]+\.[a-z]{2,}/i);
  if (bare) return { name: v.replace(bare[0], "").trim() || undefined, address: bare[0].toLowerCase() };
  return v ? { name: v } : undefined;
}

/** Splits a plain-text forward into the forwarded headers and the original body. */
export function parseForwardedText(text: string): { sender?: Sender; subject?: string; body: string } | null {
  for (const marker of FORWARD_MARKERS) {
    const m = marker.exec(text);
    if (!m) continue;
    const lines = text.slice(m.index + m[0].length).split("\n");
    const headers: Record<string, string> = {};
    let i = 0;
    while (i < lines.length && lines[i].trim() === "") i++;
    for (; i < lines.length; i++) {
      const h = lines[i].match(FORWARD_HEADER);
      if (!h) break;
      headers[h[1].toLowerCase()] = h[2].trim();
    }
    if (!headers.from) continue; // a long underscore line that isn't a forward
    return {
      sender: parseSenderLine(headers.from),
      subject: headers.subject,
      body: cleanText(lines.slice(i).join("\n")),
    };
  }
  return null;
}

function bodyText(email: Email): string {
  const text = email.text?.trim() ? email.text : email.html ? htmlToText(email.html) : "";
  return cleanText(text);
}

function collectImages(email: Email): ImageInput[] {
  return email.attachments
    .filter((a) => IMAGE_TYPES.has(a.mimeType.toLowerCase()))
    .map((a) => ({ mimeType: a.mimeType.toLowerCase(), data: toBytes(a.content), filename: a.filename ?? undefined }))
    .filter((img) => img.data.byteLength >= MIN_IMAGE_BYTES)
    .slice(0, MAX_IMAGES);
}

/**
 * Turns the raw email that reached our inbox into the message the user is actually asking about:
 * the attached original, the forwarded block, or the email itself (pasted text / screenshot).
 */
export async function suspectFromRawEmail(raw: Uint8Array | string, extra: { agentboxdRisk?: number } = {}): Promise<Suspect> {
  const outer = await PostalMime.parse(raw, { forceRfc822Attachments: true });

  const attached = outer.attachments.find((a) => a.mimeType.toLowerCase() === "message/rfc822");
  if (attached) {
    const originalRaw = toBytes(attached.content);
    const inner = await PostalMime.parse(originalRaw);
    return {
      channel: "email-attachment",
      sender: firstMailbox(inner.from),
      replyTo: firstMailbox(inner.replyTo)?.address,
      subject: inner.subject,
      text: bodyText(inner),
      html: inner.html,
      images: [],
      originalRaw,
      ...extra,
    };
  }

  const outerText = bodyText(outer);
  const fwd = parseForwardedText(outer.text ?? outerText);
  if (fwd) {
    return {
      channel: "email-forward",
      sender: fwd.sender,
      subject: fwd.subject ?? outer.subject?.replace(/^(fwd?|fw):\s*/i, ""),
      text: fwd.body,
      html: outer.html,
      images: [],
      ...extra,
    };
  }

  const images = collectImages(outer);
  // Gmail puts "[image: file.png]" in the text part of a pasted screenshot; that alone is not content.
  const text = outerText.replace(/\[image:[^\]]*\]/gi, "").trim();
  return {
    channel: images.length > 0 && text.length < 40 ? "screenshot" : "email-direct",
    subject: outer.subject,
    text,
    html: outer.html,
    images,
    ...extra,
  };
}
