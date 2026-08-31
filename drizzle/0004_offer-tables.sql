CREATE TABLE "offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"number" text NOT NULL,
	"issued_on" date NOT NULL,
	"net_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"gross_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_event_id_unique" UNIQUE("event_id"),
	CONSTRAINT "offer_gross_matches_parts" CHECK ("offer"."gross_cents" = "offer"."net_cents" + "offer"."vat_cents"),
	CONSTRAINT "offer_net_cents_nonnegative" CHECK ("offer"."net_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "offer_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_net_cents" integer NOT NULL,
	CONSTRAINT "offer_line_quantity_positive" CHECK ("offer_line"."quantity" >= 1),
	CONSTRAINT "offer_line_unit_net_cents_nonnegative" CHECK ("offer_line"."unit_net_cents" >= 0),
	CONSTRAINT "offer_line_description_present" CHECK (btrim("offer_line"."description") <> '')
);
--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_line" ADD CONSTRAINT "offer_line_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE cascade ON UPDATE no action;