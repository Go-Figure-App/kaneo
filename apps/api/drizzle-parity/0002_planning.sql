CREATE TABLE "initiative" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"health" text DEFAULT 'on_track' NOT NULL,
	"owner_id" text,
	"target_date" date,
	"icon" text,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "initiative_status_check" CHECK ("initiative"."status" IN ('planned', 'active', 'completed')),
	CONSTRAINT "initiative_health_check" CHECK ("initiative"."health" IN ('on_track', 'at_risk', 'off_track')),
	CONSTRAINT "initiative_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "initiative_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "initiative_project" (
	"initiative_id" text NOT NULL,
	"project_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "initiative_project_initiative_id_project_id_pk" PRIMARY KEY("initiative_id","project_id"),
	CONSTRAINT "initiative_project_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "initiative_project_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "project_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"target_date" date,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_milestone_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "status_update" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_type" text NOT NULL,
	"parent_id" text NOT NULL,
	"author_id" text,
	"health" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_update_parent_check" CHECK ("status_update"."parent_type" IN ('project', 'initiative')),
	CONSTRAINT "status_update_health_check" CHECK ("status_update"."health" IN ('on_track', 'at_risk', 'off_track')),
	CONSTRAINT "status_update_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX "initiative_project_project_idx" ON "initiative_project" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "initiative_workspace_position_idx" ON "initiative" USING btree ("workspace_id","position");
--> statement-breakpoint
CREATE INDEX "project_milestone_project_position_idx" ON "project_milestone" USING btree ("project_id","position");
--> statement-breakpoint
CREATE INDEX "status_update_parent_created_idx" ON "status_update" USING btree ("parent_type","parent_id","created_at","id");
--> statement-breakpoint
CREATE INDEX "task_ext_milestone_id_idx" ON "task_ext" USING btree ("milestone_id");
