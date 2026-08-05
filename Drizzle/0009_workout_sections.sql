ALTER TABLE "user_logs" ADD COLUMN "section" text DEFAULT 'levels' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_logs_user_section_date_uq" ON "user_logs" USING btree ("user_id","section","user_schedule_date");--> statement-breakpoint
CREATE INDEX "user_setting_user_id_idx" ON "user_setting" USING btree ("user_id");