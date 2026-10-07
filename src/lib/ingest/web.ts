import { cleanText } from "../text";
import type { ImageInput, Sender, Suspect } from "../types";
import { parseForwardedText, parseSenderLine, suspectFromOriginalEmail } from "./email";

export const MAX_TEXT_CHARS = 20_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 3;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic"]);
const HEADER_LINE = /^(from|subject|reply-to|date|to|sent)\s*:\s*(.*)$/i;

export class InputError extends Error {}

/** Header lines someone copied along with the message ("From: ...", "Subject: ..."), if any. */
function leadingHeaders(text: string): { sender?: Sender; replyTo?: string; subject?: string; body: string } {
  const lines = text.split("\n");
  const headers: Record<string, string> = {};
  let i = 0;
  for (; i < Math.min(lines.length, 8); i++) {
    const h = lines[i].trim().match(HEADER_LINE);
    if (!h) break;
    headers[h[1].toLowerCase()] = h[2].trim();
  }
  if (!headers.from && !headers.subject) return { body: text };
  return {
    sender: headers.from ? parseSenderLine(headers.from) : undefined,
    replyTo: headers["reply-to"] ? parseSenderLine(headers["reply-to"])?.address : undefined,
    subject: headers.subject,
    body: lines.slice(i).join("\n"),
  };
}

/**
 * Builds the message to check from the web form: pasted text, screenshots, or a saved .eml file.
 * A .eml file is the best input, since it keeps the original headers and digital signature.
 */
export async function suspectFromWebForm(form: FormData): Promise<Suspect> {
  const text = cleanText(String(form.get("text") ?? "")).slice(0, MAX_TEXT_CHARS);
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of files) if (f.size > MAX_FILE_BYTES) throw new InputError(`${f.name} is bigger than 5 MB.`);

  const eml = files.find((f) => f.name.toLowerCase().endsWith(".eml") || f.type === "message/rfc822");
  // A saved .eml is the original email itself, so it's read like a forward-as-attachment.
  if (eml) return suspectFromOriginalEmail(new Uint8Array(await eml.arrayBuffer()));

  const images: ImageInput[] = [];
  for (const f of files.slice(0, MAX_IMAGES)) {
    const type = f.type.toLowerCase();
    if (!IMAGE_TYPES.has(type)) throw new InputError(`${f.name} isn't a screenshot (PNG, JPEG, WebP or HEIC) or a .eml file.`);
    images.push({ mimeType: type, data: new Uint8Array(await f.arrayBuffer()), filename: f.name });
  }
  if (!text.trim() && images.length === 0) throw new InputError("Paste the message or add a screenshot first.");

  const fwd = parseForwardedText(text);
  const parsed = fwd ? { sender: fwd.sender, subject: fwd.subject, body: fwd.body, replyTo: undefined } : leadingHeaders(text);
  return {
    channel: images.length && !parsed.body.trim() ? "screenshot" : "web",
    sender: parsed.sender,
    replyTo: parsed.replyTo,
    subject: parsed.subject,
    text: cleanText(parsed.body),
    images,
  };
}
