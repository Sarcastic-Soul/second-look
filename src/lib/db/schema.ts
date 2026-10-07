import { index, integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** One analysed message, from email or the web checker. The analysis includes the message text so the report page can quote it. */
export const checks = pgTable(
  "checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source", { enum: ["email", "web"] }).notNull(),
    /** Agentboxd message id: a webhook delivered twice must only be answered once. */
    messageId: text("message_id").unique(),
    /** SHA-256 of the requester's address (email) or IP (web), for rate limiting without storing it. */
    requesterHash: text("requester_hash").notNull(),
    status: text("status", { enum: ["processing", "done", "failed", "skipped"] }).notNull().default("processing"),
    channel: text("channel"),
    verdict: text("verdict", { enum: ["scam", "suspicious", "safe"] }),
    confidence: real("confidence"),
    scamType: text("scam_type"),
    /** The full Analysis (checks + verdict), shown on the report page. */
    analysis: jsonb("analysis"),
    totalMs: integer("total_ms"),
    error: text("error"),
  },
  (t) => [index("checks_requester_created_idx").on(t.requesterHash, t.createdAt)],
);

export type CheckRow = typeof checks.$inferSelect;

/**
 * A person's one trusted family contact. Both sides confirm by email before any alert goes out:
 * the owner, so nobody can sign someone else up and watch their mail, and the contact, so we never
 * mail a stranger more than once.
 */
export const familyLinks = pgTable(
  "family_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Same hash as checks.requesterHash for this person's email, so an inbound check can find their link. */
    ownerHash: text("owner_hash").notNull(),
    ownerName: text("owner_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactName: text("contact_name").notNull(),
    status: text("status", { enum: ["pending_owner", "pending_contact", "active", "stopped"] })
      .notNull()
      .default("pending_owner"),
    /** Secret in the owner's links (confirm, stop). */
    ownerToken: text("owner_token").notNull().unique(),
    /** Secret in the contact's links (accept, stop). */
    contactToken: text("contact_token").notNull().unique(),
    /** Hash of the sign-up IP, to limit sign-ups per hour. */
    requesterHash: text("requester_hash").notNull(),
    lastAlertAt: timestamp("last_alert_at", { withTimezone: true }),
  },
  (t) => [index("family_links_owner_idx").on(t.ownerHash, t.status), index("family_links_requester_idx").on(t.requesterHash, t.createdAt)],
);

export type FamilyLink = typeof familyLinks.$inferSelect;
