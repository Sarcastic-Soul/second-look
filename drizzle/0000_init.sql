CREATE TABLE "checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"message_id" text,
	"requester_hash" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"channel" text,
	"verdict" text,
	"confidence" real,
	"scam_type" text,
	"analysis" jsonb,
	"total_ms" integer,
	"error" text,
	CONSTRAINT "checks_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE INDEX "checks_requester_created_idx" ON "checks" USING btree ("requester_hash","created_at");