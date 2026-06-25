CREATE TABLE "app_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"event" text NOT NULL,
	"email" text,
	"user_id" text,
	"source" text DEFAULT 'app.gymnasticbodies.com',
	"data" json
);
--> statement-breakpoint
CREATE INDEX "app_logs_event_idx" ON "app_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "app_logs_ts_idx" ON "app_logs" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "app_logs_email_idx" ON "app_logs" USING btree ("email");
