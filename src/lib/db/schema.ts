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
