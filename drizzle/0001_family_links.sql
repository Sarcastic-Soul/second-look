CREATE TABLE "family_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_hash" text NOT NULL,
	"owner_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_name" text NOT NULL,
	"status" text DEFAULT 'pending_owner' NOT NULL,
	"owner_token" text NOT NULL,
	"contact_token" text NOT NULL,
	"requester_hash" text NOT NULL,
	"last_alert_at" timestamp with time zone,
	CONSTRAINT "family_links_owner_token_unique" UNIQUE("owner_token"),
	CONSTRAINT "family_links_contact_token_unique" UNIQUE("contact_token")
);
--> statement-breakpoint
CREATE INDEX "family_links_owner_idx" ON "family_links" USING btree ("owner_hash","status");--> statement-breakpoint
CREATE INDEX "family_links_requester_idx" ON "family_links" USING btree ("requester_hash","created_at");