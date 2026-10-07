ALTER TABLE "invoice" ADD COLUMN "description" text DEFAULT 'Rechnung' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ALTER COLUMN "description" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_description_present" CHECK (btrim("invoice"."description") <> '');--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_storno_of_id_unique" UNIQUE("storno_of_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_invoice_amount_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.net_cents IS DISTINCT FROM OLD.net_cents
     OR NEW.vat_cents IS DISTINCT FROM OLD.vat_cents
     OR NEW.gross_cents IS DISTINCT FROM OLD.gross_cents
     OR NEW.number IS DISTINCT FROM OLD.number
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.storno_of_id IS DISTINCT FROM OLD.storno_of_id
     OR NEW.event_id IS DISTINCT FROM OLD.event_id
     OR NEW.description IS DISTINCT FROM OLD.description
  THEN
    RAISE EXCEPTION 'invoices are append-only';
  END IF;
  RETURN NEW;
END;
$$;
