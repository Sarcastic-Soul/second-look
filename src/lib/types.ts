export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

export interface CheckResult {
  /** Stable id the verdict can cite, e.g. "domain-age:usps-track.info". */
  id: string;
  /** Short human label, e.g. "Domain age". */
  name: string;
  status: CheckStatus;
  /** One plain-English sentence a non-technical reader can follow. */
  detail: string;
  data?: Record<string, unknown>;
}

export type Channel =
  | "email-forward" // a normal forward: original sender only known from the forwarded block
  | "email-attachment" // forwarded as .eml: original headers and DKIM signatures intact
  | "email-direct" // someone pasted or typed the message into a new email
  | "screenshot" // an image of an SMS / WhatsApp / email
  | "web"; // pasted into the web checker

export interface Sender {
  name?: string;
  address?: string;
}

export interface ImageInput {
  mimeType: string;
  data: Uint8Array;
  filename?: string;
}

/** The suspicious message, normalised from whatever channel it came in on. */
export interface Suspect {
  channel: Channel;
  sender?: Sender;
  replyTo?: string;
  subject?: string;
  text: string;
  html?: string;
  images: ImageInput[];
  /** Raw RFC 822 bytes of the original email, only when it was forwarded as an attachment. */
  originalRaw?: Uint8Array;
  /** Agentboxd's own phishing probability for the message, when it arrived by email. */
  agentboxdRisk?: number;
}

export interface FoundLink {
  url: string;
  /** Visible text of an HTML link, when it differs from the URL. */
  shownAs?: string;
}
