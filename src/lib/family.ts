import { randomBytes } from "node:crypto";
import { and, count, eq, gt, ne, or } from "drizzle-orm";
import { agentboxd } from "./agentboxd";
import { db, schema } from "./db";
import type { FamilyLink } from "./db/schema";
import { hashRequester } from "./email/handle-inbound";
import { esc, type ReplyContent } from "./email/reply";
import type { Analysis } from "./pipeline";
import { INBOX_ADDRESS } from "./site";

/** Only clear, confident scams reach family. A "Be careful" verdict would just worry them. */
const MIN_CONFIDENCE = Number(process.env.FAMILY_ALERT_MIN_CONFIDENCE ?? 0.8);
/** One alert per half hour at most, so a burst of forwarded scams doesn't flood the contact. */
const ALERT_GAP_MS = 30 * 60 * 1000;
const SIGNUPS_PER_HOUR = 5;

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export type Role = "owner" | "contact";

export class SignupError extends Error {}

function appUrl(path: string): string {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

let inboxId: string | null = null;
/** The id of our inbox, looked up by address once per server instance. */
async function ourInboxId(): Promise<string> {
  if (process.env.AGENTBOXD_INBOX_ID) return process.env.AGENTBOXD_INBOX_ID;
  if (!inboxId) {
    const page = await agentboxd().inboxes.list();
    const inbox = page.data.find((i) => i.address.toLowerCase() === INBOX_ADDRESS);
    if (!inbox) throw new Error(`inbox ${INBOX_ADDRESS} not found`);
    inboxId = inbox.id;
  }
  return inboxId;
}

async function send(to: string, subject: string, content: ReplyContent, label: string) {
  if (process.env.DRY_RUN === "1") return void console.log(`[family] DRY RUN to ${to}: ${subject}\n${content.text}`);
  await agentboxd().messages.send(await ourInboxId(), { to, subject, text: content.text, html: content.html, labels: [label] });
}

/** Short plain emails: a few paragraphs and one button-like link. */
function mail(paragraphs: string[], link: { url: string; label: string }, footer: string): ReplyContent {
  const text = [...paragraphs, `${link.label}: ${link.url}`, `--\n${footer}`].join("\n\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2328;max-width:560px">
${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n")}
<p><a href="${esc(link.url)}" style="display:inline-block;background:#0f5e5a;color:#f7f1e6;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">${esc(link.label)}</a></p>
<p style="margin-top:24px;border-top:1px solid #d0d7de;padding-top:12px;font-size:13px;color:#57606a">${esc(footer)}</p>
</div>`;
  return { text, html };
}

export interface SignupInput {
  ownerName: string;
  ownerEmail: string;
  contactName: string;
  contactEmail: string;
  consent: boolean;
  ip: string;
}

/** Step 1: store the link and ask the owner to confirm from the address they forward from. */
export async function startSignup(input: SignupInput): Promise<void> {
  const ownerName = input.ownerName.trim().slice(0, 60);
  const contactName = input.contactName.trim().slice(0, 60);
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (!ownerName || !contactName) throw new SignupError("Please fill in both names.");
  if (!EMAIL_RE.test(ownerEmail) || !EMAIL_RE.test(contactEmail)) throw new SignupError("Please check both email addresses.");
  if (ownerEmail === contactEmail) throw new SignupError("Your trusted contact needs a different email address from yours.");
  if (!input.consent) throw new SignupError("Please tick the box to say your contact is happy to get these alerts.");

  const requesterHash = hashRequester(`ip:${input.ip}`);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ n }] = await db()
    .select({ n: count() })
    .from(schema.familyLinks)
    .where(and(eq(schema.familyLinks.requesterHash, requesterHash), gt(schema.familyLinks.createdAt, hourAgo)));
  if (n >= SIGNUPS_PER_HOUR) throw new SignupError("Too many sign-ups from here in the last hour. Please try again later.");

  const ownerToken = newToken();
  await db().insert(schema.familyLinks).values({
    ownerHash: hashRequester(ownerEmail),
    ownerName,
    contactEmail,
    contactName,
    ownerToken,
    contactToken: newToken(),
    requesterHash,
  });

  await send(
    ownerEmail,
    "Confirm your Second Look family alerts",
    mail(
      [
        `Hi ${ownerName},`,
        `You asked Second Look to tell ${contactName} when a message you forward to us is clearly a scam. Please confirm it was you.`,
        `Once you confirm, we'll ask ${contactName} to say yes too. Nothing is sent to them until then.`,
      ],
      { url: appUrl(`/family/${ownerToken}`), label: "Confirm" },
      "If you didn't ask for this, ignore this email and nothing will happen.",
    ),
    "family-confirm",
  );
}

export async function findLink(token: string): Promise<{ link: FamilyLink; role: Role } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [link] = await db()
    .select()
    .from(schema.familyLinks)
    .where(or(eq(schema.familyLinks.ownerToken, token), eq(schema.familyLinks.contactToken, token)))
    .limit(1);
  if (!link) return null;
  return { link, role: link.ownerToken === token ? "owner" : "contact" };
}

/** Step 2: the owner confirmed, so invite the contact. */
export async function confirmOwner(token: string): Promise<void> {
  const found = await findLink(token);
  if (!found || found.role !== "owner" || found.link.status !== "pending_owner") return;
  const { link } = found;
  // Invite first: if sending fails, the owner can press confirm again.
  await send(
    link.contactEmail,
    `${link.ownerName} would like you as their trusted contact`,
    mail(
      [
        `Hi ${link.contactName},`,
        `${link.ownerName} uses Second Look to check suspicious emails and texts before they tap anything. They'd like us to email you when one of those messages is clearly a scam, so you can check in with them.`,
        "You'd get a short email with what the message was and a link to our report. Nothing else, and you can stop at any time.",
      ],
      { url: appUrl(`/family/${link.contactToken}`), label: "Say yes or no" },
      `Second Look (${INBOX_ADDRESS}) helps people spot scam messages. If you don't know ${link.ownerName}, ignore this email and we won't write again.`,
    ),
    "family-invite",
  );
  await db().update(schema.familyLinks).set({ status: "pending_contact" }).where(eq(schema.familyLinks.id, link.id));
}

/** Step 3: the contact said yes. A person has one trusted contact, so any older one stops. */
export async function acceptContact(token: string): Promise<void> {
  const found = await findLink(token);
  if (!found || found.role !== "contact" || found.link.status !== "pending_contact") return;
  const { link } = found;
  await db()
    .update(schema.familyLinks)
    .set({ status: "stopped" })
    .where(and(eq(schema.familyLinks.ownerHash, link.ownerHash), eq(schema.familyLinks.status, "active"), ne(schema.familyLinks.id, link.id)));
  await db().update(schema.familyLinks).set({ status: "active" }).where(eq(schema.familyLinks.id, link.id));
}

/** Either side can stop alerts (or decline the invite) with their own link. */
export async function stopLink(token: string): Promise<void> {
  const found = await findLink(token);
  if (!found) return;
  await db().update(schema.familyLinks).set({ status: "stopped" }).where(eq(schema.familyLinks.id, found.link.id));
}

/**
 * After a confident scam verdict on a forwarded message, emails the sender's trusted contact.
 * Returns the contact's name when an alert went out, for the note in the reply. Never throws:
 * a failed alert must not stop the person getting their own answer.
 */
export async function alertFamily(requesterHash: string, analysis: Analysis, reportUrl?: string): Promise<string | null> {
  const v = analysis.verdict;
  if (v.verdict !== "scam" || v.confidence < MIN_CONFIDENCE) return null;
  try {
    const [link] = await db()
      .select()
      .from(schema.familyLinks)
      .where(and(eq(schema.familyLinks.ownerHash, requesterHash), eq(schema.familyLinks.status, "active")))
      .limit(1);
    if (!link) return null;
    if (link.lastAlertAt && Date.now() - link.lastAlertAt.getTime() < ALERT_GAP_MS) return null;

    const confidence = Math.round(v.confidence * 100);
    const paragraphs = [
      `Hi ${link.contactName},`,
      `${link.ownerName} just sent us a message to check, and it's a scam (${confidence}% sure): ${v.headline}`,
      `We've told them not to tap any links, reply, or share codes or card details. It might still be worth giving them a call.`,
    ];
    const footer = `You get these because ${link.ownerName} added you as their trusted contact on Second Look. Stop these alerts: ${appUrl(`/family/${link.contactToken}`)}`;
    const content = reportUrl
      ? mail(paragraphs, { url: reportUrl, label: "See what the message said" }, footer)
      : mail(paragraphs, { url: appUrl(`/family/${link.contactToken}`), label: "Manage alerts" }, footer);
    await send(link.contactEmail, `${link.ownerName} got a scam message`, content, "family-alert");
    await db().update(schema.familyLinks).set({ lastAlertAt: new Date() }).where(eq(schema.familyLinks.id, link.id));
    return link.contactName;
  } catch (e) {
    console.error(`[family] alert failed: ${(e as Error).message}`);
    return null;
  }
}
