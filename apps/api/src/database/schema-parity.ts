import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  columnTable,
  projectTable,
  taskTable,
  userTable,
  workspaceTable,
} from "./schema";
import type { Category } from "../parity/foundation/categories";

export const taskExtTable = pgTable(
  "task_ext",
  {
    taskId: text("task_id")
      .primaryKey()
      .references(() => taskTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    estimate: integer("estimate"),
    cycleId: text("cycle_id"),
    milestoneId: text("milestone_id"),
    triageState: text("triage_state").$type<
      "pending" | "accepted" | "declined" | "duplicate"
    >(),
    triageSource: text("triage_source"),
    triagedBy: text("triaged_by").references(() => userTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    triagedAt: timestamp("triaged_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    duplicateOfTaskId: text("duplicate_of_task_id").references(
      () => taskTable.id,
      { onDelete: "set null", onUpdate: "cascade" },
    ),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (table) => [
    index("task_ext_completed_at_idx").on(table.completedAt),
    index("task_ext_cycle_id_idx").on(table.cycleId),
    index("task_ext_milestone_id_idx").on(table.milestoneId),
    index("task_ext_triage_pending_idx")
      .on(table.snoozedUntil, table.taskId)
      .where(sql`${table.triageState} = 'pending'`),
    check("task_ext_estimate_check", sql`${table.estimate} >= 0`),
    check(
      "task_ext_triage_state_check",
      sql`${table.triageState} IN ('pending', 'accepted', 'declined', 'duplicate')`,
    ),
    check(
      "task_ext_duplicate_check",
      sql`${table.duplicateOfTaskId} <> ${table.taskId}`,
    ),
  ],
);

export const projectExtTable = pgTable(
  "project_ext",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projectTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: text("status")
      .$type<
        "backlog" | "planned" | "started" | "paused" | "completed" | "canceled"
      >()
      .notNull()
      .default("backlog"),
    health: text("health")
      .$type<"on_track" | "at_risk" | "off_track">()
      .notNull()
      .default("on_track"),
    leadId: text("lead_id").references(() => userTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    priority: text("priority")
      .$type<"no-priority" | "low" | "medium" | "high" | "urgent">()
      .notNull()
      .default("no-priority"),
    triageEnabled: boolean("triage_enabled").notNull().default(false),
    triageOwnerId: text("triage_owner_id").references(() => userTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    intakeToken: text("intake_token").unique(),
  },
  (table) => [
    check(
      "project_ext_status_check",
      sql`${table.status} IN ('backlog', 'planned', 'started', 'paused', 'completed', 'canceled')`,
    ),
    check(
      "project_ext_health_check",
      sql`${table.health} IN ('on_track', 'at_risk', 'off_track')`,
    ),
    check(
      "project_ext_priority_check",
      sql`${table.priority} IN ('no-priority', 'low', 'medium', 'high', 'urgent')`,
    ),
    check(
      "project_ext_dates_check",
      sql`${table.targetDate} >= ${table.startDate}`,
    ),
  ],
);

export const columnExtTable = pgTable(
  "column_ext",
  {
    columnId: text("column_id")
      .primaryKey()
      .references(() => columnTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    category: text("category").$type<Category>().notNull(),
  },
  (table) => [
    check(
      "column_ext_category_check",
      sql`${table.category} IN ('backlog', 'unstarted', 'started', 'completed', 'canceled')`,
    ),
  ],
);

export const workspaceExtTable = pgTable(
  "workspace_ext",
  {
    workspaceId: text("workspace_id")
      .primaryKey()
      .references(() => workspaceTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    estimateScale: text("estimate_scale").notNull().default("none"),
    cyclesEnabled: boolean("cycles_enabled").notNull().default(false),
    cycleWeeks: integer("cycle_weeks").notNull().default(2),
    cooldownWeeks: integer("cooldown_weeks").notNull().default(0),
    cycleStartDay: integer("cycle_start_day").notNull().default(1),
    upcomingCycles: integer("upcoming_cycles").notNull().default(2),
    autoRollover: boolean("auto_rollover").notNull().default(true),
  },
  (table) => [
    check(
      "workspace_ext_scale_check",
      sql`${table.estimateScale} IN ('none', 'linear', 'fibonacci', 't-shirt')`,
    ),
    check("workspace_ext_cycle_weeks_check", sql`${table.cycleWeeks} > 0`),
    check("workspace_ext_cooldown_check", sql`${table.cooldownWeeks} >= 0`),
    check(
      "workspace_ext_start_day_check",
      sql`${table.cycleStartDay} BETWEEN 0 AND 6`,
    ),
    check("workspace_ext_upcoming_check", sql`${table.upcomingCycles} > 0`),
  ],
);

export const projectMilestoneTable = pgTable(
  "project_milestone",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    projectId: text("project_id")
      .notNull()
      .references(() => projectTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    targetDate: date("target_date"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_milestone_project_position_idx").on(
      table.projectId,
      table.position,
    ),
  ],
);

export const initiativeTable = pgTable(
  "initiative",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaceTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status")
      .$type<"planned" | "active" | "completed">()
      .notNull()
      .default("planned"),
    health: text("health")
      .$type<"on_track" | "at_risk" | "off_track">()
      .notNull()
      .default("on_track"),
    ownerId: text("owner_id").references(() => userTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    targetDate: date("target_date"),
    icon: text("icon"),
    color: text("color"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("initiative_workspace_position_idx").on(
      table.workspaceId,
      table.position,
    ),
    check(
      "initiative_status_check",
      sql`${table.status} IN ('planned', 'active', 'completed')`,
    ),
    check(
      "initiative_health_check",
      sql`${table.health} IN ('on_track', 'at_risk', 'off_track')`,
    ),
  ],
);

export const initiativeProjectTable = pgTable(
  "initiative_project",
  {
    initiativeId: text("initiative_id")
      .notNull()
      .references(() => initiativeTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    projectId: text("project_id")
      .notNull()
      .references(() => projectTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.initiativeId, table.projectId] }),
    index("initiative_project_project_idx").on(table.projectId),
  ],
);

export const statusUpdateTable = pgTable(
  "status_update",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    parentType: text("parent_type").$type<"project" | "initiative">().notNull(),
    parentId: text("parent_id").notNull(),
    authorId: text("author_id").references(() => userTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    health: text("health")
      .$type<"on_track" | "at_risk" | "off_track">()
      .notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("status_update_parent_created_idx").on(
      table.parentType,
      table.parentId,
      table.createdAt,
      table.id,
    ),
    check(
      "status_update_parent_check",
      sql`${table.parentType} IN ('project', 'initiative')`,
    ),
    check(
      "status_update_health_check",
      sql`${table.health} IN ('on_track', 'at_risk', 'off_track')`,
    ),
  ],
);
