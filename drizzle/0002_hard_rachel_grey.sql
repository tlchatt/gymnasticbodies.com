CREATE TABLE "support_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_message_id" text,
	"gmail_thread_id" text,
	"from_email" text NOT NULL,
	"from_name" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"received_at" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_notes" text,
	"user_id" text,
	"assigned_to" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_emails_gmail_message_id_unique" UNIQUE("gmail_message_id")
);
--> statement-breakpoint
CREATE TABLE "support_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"admin_user_id" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"gmail_message_id" text
);
--> statement-breakpoint
ALTER TABLE "support_emails" ADD CONSTRAINT "support_emails_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_emails" ADD CONSTRAINT "support_emails_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_replies" ADD CONSTRAINT "support_replies_email_id_support_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."support_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_replies" ADD CONSTRAINT "support_replies_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_emails_from_idx" ON "support_emails" USING btree ("from_email");--> statement-breakpoint
CREATE INDEX "support_emails_status_idx" ON "support_emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_emails_received_idx" ON "support_emails" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "support_emails_user_idx" ON "support_emails" USING btree ("user_id");