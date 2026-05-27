CREATE TABLE "outbound_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"campaign" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"case_id" integer
);
--> statement-breakpoint
ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbound_emails_user_idx" ON "outbound_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "outbound_emails_email_idx" ON "outbound_emails" USING btree ("to_email");--> statement-breakpoint
CREATE INDEX "outbound_emails_sent_idx" ON "outbound_emails" USING btree ("sent_at");