CREATE TYPE "public"."appointment_kind" AS ENUM('viewing', 'planning');--> statement-breakpoint
CREATE TYPE "public"."calendar_block_source" AS ENUM('booked', 'viewing', 'planning', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('new', 'viewing', 'offer', 'booked', 'planning', 'done', 'lost');--> statement-breakpoint
CREATE TYPE "public"."invoice_kind" AS ENUM('invoice', 'storno');--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "appointment_kind" NOT NULL,
	"period" "tstzrange" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_viewing_is_60_minutes" CHECK ("appointment"."kind" <> 'viewing' OR (upper("appointment"."period") - lower("appointment"."period") = interval '60 minutes'))
);
--> statement-breakpoint
CREATE TABLE "calendar_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"appointment_id" uuid,
	"period" "tstzrange" NOT NULL,
	"blocks_calendar" boolean NOT NULL,
	"source" "calendar_block_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"couple_a_name" text NOT NULL,
	"couple_b_name" text NOT NULL,
	"status" "event_status" DEFAULT 'new' NOT NULL,
	"lost_reason" text,
	"reserved_until" timestamp with time zone,
	"guest_count" integer,
	"quoted_net_cents" integer,
	"event_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_lost_reason" CHECK ((
        ("event"."status" = 'lost' AND "event"."lost_reason" IS NOT NULL AND btrim("event"."lost_reason") <> '')
        OR
        ("event"."status" <> 'lost' AND "event"."lost_reason" IS NULL)
      )),
	CONSTRAINT "event_guest_count_nonnegative" CHECK ("event"."guest_count" IS NULL OR "event"."guest_count" >= 0),
	CONSTRAINT "event_quoted_net_cents_nonnegative" CHECK ("event"."quoted_net_cents" IS NULL OR "event"."quoted_net_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"number" text NOT NULL,
	"kind" "invoice_kind" DEFAULT 'invoice' NOT NULL,
	"storno_of_id" uuid,
	"net_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"gross_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_number_unique" UNIQUE("number"),
	CONSTRAINT "invoice_storno_of" CHECK ((
        ("invoice"."kind" = 'storno' AND "invoice"."storno_of_id" IS NOT NULL)
        OR
        ("invoice"."kind" = 'invoice' AND "invoice"."storno_of_id" IS NULL)
      )),
	CONSTRAINT "invoice_gross_matches_parts" CHECK ("invoice"."gross_cents" = "invoice"."net_cents" + "invoice"."vat_cents")
);
--> statement-breakpoint
CREATE TABLE "invoice_counter" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_n" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_block" ADD CONSTRAINT "calendar_block_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_block" ADD CONSTRAINT "calendar_block_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_storno_of_id_invoice_id_fk" FOREIGN KEY ("storno_of_id") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_block" ADD CONSTRAINT "calendar_block_period_excl" EXCLUDE USING gist ("period" WITH &&) WHERE ("blocks_calendar");--> statement-breakpoint
CREATE FUNCTION forbid_invoice_amount_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.net_cents IS DISTINCT FROM OLD.net_cents
     OR NEW.vat_cents IS DISTINCT FROM OLD.vat_cents
     OR NEW.gross_cents IS DISTINCT FROM OLD.gross_cents
     OR NEW.number IS DISTINCT FROM OLD.number
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.storno_of_id IS DISTINCT FROM OLD.storno_of_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id
  THEN
    RAISE EXCEPTION 'invoices are append-only';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER invoice_append_only BEFORE UPDATE ON "invoice" FOR EACH ROW EXECUTE FUNCTION forbid_invoice_amount_update();