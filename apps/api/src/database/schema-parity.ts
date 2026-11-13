import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
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
    status: text("status").notNull().default("backlog"),
    health: text("health").notNull().default("on_track"),
    leadId: text("lead_id").references(() => userTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    priority: text("priority").notNull().default("no-priority"),
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
