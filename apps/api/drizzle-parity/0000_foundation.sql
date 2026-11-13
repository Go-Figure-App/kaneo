CREATE TABLE "column_ext" (
	"column_id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "column_ext_category_check" CHECK ("column_ext"."category" IN ('backlog', 'unstarted', 'started', 'completed', 'canceled')),
	CONSTRAINT "column_ext_column_id_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."column"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "project_ext" (
	"project_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'backlog' NOT NULL,
	"health" text DEFAULT 'on_track' NOT NULL,
	"lead_id" text,
	"start_date" date,
	"target_date" date,
	"priority" text DEFAULT 'no-priority' NOT NULL,
	"triage_enabled" boolean DEFAULT false NOT NULL,
	"triage_owner_id" text,
	"intake_token" text,
	CONSTRAINT "project_ext_intake_token_unique" UNIQUE("intake_token"),
	CONSTRAINT "project_ext_status_check" CHECK ("project_ext"."status" IN ('backlog', 'planned', 'started', 'paused', 'completed', 'canceled')),
	CONSTRAINT "project_ext_health_check" CHECK ("project_ext"."health" IN ('on_track', 'at_risk', 'off_track')),
	CONSTRAINT "project_ext_priority_check" CHECK ("project_ext"."priority" IN ('no-priority', 'low', 'medium', 'high', 'urgent')),
	CONSTRAINT "project_ext_dates_check" CHECK ("project_ext"."target_date" >= "project_ext"."start_date"),
	CONSTRAINT "project_ext_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "project_ext_lead_id_user_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "project_ext_triage_owner_id_user_id_fk" FOREIGN KEY ("triage_owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "task_ext" (
	"task_id" text PRIMARY KEY NOT NULL,
	"estimate" integer,
	"cycle_id" text,
	"milestone_id" text,
	"triage_state" text,
	"triage_source" text,
	"triaged_by" text,
	"triaged_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"duplicate_of_task_id" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "task_ext_estimate_check" CHECK ("task_ext"."estimate" >= 0),
	CONSTRAINT "task_ext_triage_state_check" CHECK ("task_ext"."triage_state" IN ('pending', 'accepted', 'declined', 'duplicate')),
	CONSTRAINT "task_ext_duplicate_check" CHECK ("task_ext"."duplicate_of_task_id" <> "task_ext"."task_id"),
	CONSTRAINT "task_ext_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "task_ext_triaged_by_user_id_fk" FOREIGN KEY ("triaged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "task_ext_duplicate_of_task_id_task_id_fk" FOREIGN KEY ("duplicate_of_task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "workspace_ext" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"estimate_scale" text DEFAULT 'none' NOT NULL,
	"cycles_enabled" boolean DEFAULT false NOT NULL,
	"cycle_weeks" integer DEFAULT 2 NOT NULL,
	"cooldown_weeks" integer DEFAULT 0 NOT NULL,
	"cycle_start_day" integer DEFAULT 1 NOT NULL,
	"upcoming_cycles" integer DEFAULT 2 NOT NULL,
	"auto_rollover" boolean DEFAULT true NOT NULL,
	CONSTRAINT "workspace_ext_scale_check" CHECK ("workspace_ext"."estimate_scale" IN ('none', 'linear', 'fibonacci', 't-shirt')),
	CONSTRAINT "workspace_ext_cycle_weeks_check" CHECK ("workspace_ext"."cycle_weeks" > 0),
	CONSTRAINT "workspace_ext_cooldown_check" CHECK ("workspace_ext"."cooldown_weeks" >= 0),
	CONSTRAINT "workspace_ext_start_day_check" CHECK ("workspace_ext"."cycle_start_day" BETWEEN 0 AND 6),
	CONSTRAINT "workspace_ext_upcoming_check" CHECK ("workspace_ext"."upcoming_cycles" > 0),
	CONSTRAINT "workspace_ext_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX "task_ext_completed_at_idx" ON "task_ext" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "task_ext_cycle_id_idx" ON "task_ext" USING btree ("cycle_id");