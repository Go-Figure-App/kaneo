CREATE TABLE "favorite" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"target_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "favorite_user_id_kind_target_id_pk" PRIMARY KEY("user_id","kind","target_id"),
	CONSTRAINT "favorite_kind_check" CHECK ("favorite"."kind" IN ('view', 'project', 'initiative', 'cycle', 'task')),
	CONSTRAINT "favorite_position_check" CHECK ("favorite"."position" >= 0),
	CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "saved_view" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"shared" boolean DEFAULT false NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"display" jsonb NOT NULL,
	CONSTRAINT "saved_view_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "saved_view_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade,
	CONSTRAINT "saved_view_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE TABLE "task_template" (
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"defaults" jsonb NOT NULL,
	CONSTRAINT "task_template_project_id_name_pk" PRIMARY KEY("project_id","name"),
	CONSTRAINT "task_template_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX "favorite_user_position_idx" ON "favorite" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "saved_view_workspace_owner_idx" ON "saved_view" USING btree ("workspace_id","owner_id");--> statement-breakpoint
CREATE INDEX "saved_view_project_idx" ON "saved_view" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "saved_view_owner_idx" ON "saved_view" USING btree ("owner_id");