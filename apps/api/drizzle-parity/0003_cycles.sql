CREATE TABLE "cycle" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "number" integer NOT NULL,
  "name" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "summary" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cycle_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade,
  CONSTRAINT "cycle_dates_check" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "cycle_number_check" CHECK ("number" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_workspace_number_idx" ON "cycle" USING btree ("workspace_id", "number");
--> statement-breakpoint
CREATE INDEX "cycle_workspace_starts_at_idx" ON "cycle" USING btree ("workspace_id", "starts_at");
--> statement-breakpoint
CREATE TABLE "cycle_day" (
  "cycle_id" text NOT NULL,
  "day" date NOT NULL,
  "scope_count" integer NOT NULL,
  "scope_points" bigint NOT NULL,
  "started_count" integer NOT NULL,
  "started_points" bigint NOT NULL,
  "completed_count" integer NOT NULL,
  "completed_points" bigint NOT NULL,
  "project_totals" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "cycle_day_cycle_id_day_pk" PRIMARY KEY ("cycle_id", "day"),
  CONSTRAINT "cycle_day_cycle_id_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycle"("id") ON DELETE cascade ON UPDATE cascade
);

--> statement-breakpoint
ALTER TABLE "workspace_ext" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;
