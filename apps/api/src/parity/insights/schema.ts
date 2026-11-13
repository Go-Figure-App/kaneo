import { z } from "../../openapi";
import { id } from "../planning/schema";

export const measures = [
  "throughput",
  "lead-time",
  "cycle-time",
  "velocity",
  "burndown",
  "scope-change",
  "created-completed",
  "time-in-state",
  "workload",
  "time-to-triage",
] as const;
export const slices = [
  "week",
  "cycle",
  "assignee",
  "project",
  "label",
  "priority",
] as const;
export const insightsQuery = z.strictObject({
  measure: z.enum(measures),
  slice: z.enum(slices).optional(),
  projectId: id.optional(),
  initiativeId: id.optional(),
  cycleId: id.optional(),
  assigneeId: id.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type InsightsQuery = z.infer<typeof insightsQuery>;
export type Measure = InsightsQuery["measure"];
export type Slice = (typeof slices)[number];

export const rowSchema = z.strictObject({
  key: z.string(),
  label: z.string().nullable(),
  series: z.enum([
    "total",
    "median",
    "p75",
    "created",
    "completed",
    "average",
    "remaining",
    "ideal",
    "start",
    "end",
    "backlog",
    "unstarted",
    "started",
    "canceled",
  ]),
  value: z.number(),
  points: z.number().nullable(),
  samples: z.number().int().nonnegative(),
});
export type InsightRow = z.infer<typeof rowSchema>;
export const insightsSchema = z.strictObject({
  measure: z.enum(measures),
  slice: z.enum([...slices, "day", "category"]),
  from: z.iso.date(),
  to: z.iso.date(),
  timeZone: z.string(),
  estimates: z.boolean(),
  historyAvailable: z.boolean(),
  partialHistory: z.boolean(),
  rows: z.array(rowSchema),
});
export type Insights = z.infer<typeof insightsSchema>;
