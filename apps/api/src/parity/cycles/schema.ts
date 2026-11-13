import { nullableResponseTimestamp, responseTimestamp, z } from "../../openapi";
import { categories } from "../foundation/categories";
import { id, pageQuery } from "../planning/schema";
import { validTimeZone } from "./calendar";
import { estimateScales } from "./estimates";
import { cycleReference } from "./task-schema";

export const totalsSchema = z.object({
  scopeCount: z.number(),
  scopePoints: z.number(),
  startedCount: z.number(),
  startedPoints: z.number(),
  completedCount: z.number(),
  completedPoints: z.number(),
});
export const summarySchema = totalsSchema.extend({
  rolledOverCount: z.number(),
  rolledOverPoints: z.number(),
});
export const settingsBody = z.object({
  cyclesEnabled: z.boolean().optional(),
  estimateScale: z.enum(estimateScales).optional(),
  cycleWeeks: z.number().int().min(1).max(8).optional(),
  cooldownWeeks: z.number().int().min(0).max(8).optional(),
  cycleStartDay: z.number().int().min(0).max(6).optional(),
  upcomingCycles: z.number().int().min(1).max(15).optional(),
  autoRollover: z.boolean().optional(),
  timeZone: z
    .string()
    .min(1)
    .max(100)
    .refine(validTimeZone, "Use an IANA time zone")
    .optional(),
});
export const settingsSchema = settingsBody
  .required()
  .extend({ workspaceId: id });
export const cycleSchema = cycleReference.extend({
  workspaceId: id,
  phase: z.enum(["current", "upcoming", "past"]),
  progress: totalsSchema,
  summary: summarySchema.nullable(),
  createdAt: responseTimestamp,
  updatedAt: responseTimestamp,
});
export const cycleDetailSchema = cycleSchema.extend({
  days: z.array(totalsSchema.extend({ day: z.iso.date() })),
  historyAvailable: z.boolean(),
  settings: settingsSchema,
});
export const cyclePatch = z.object({
  name: z.string().trim().min(1).max(200).nullable().optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
});
export const cycleQuery = pageQuery.extend({
  phase: z.enum(["current", "upcoming", "past", "all"]).default("all"),
});
export const cycleTaskQuery = pageQuery.extend({
  projectId: id.optional(),
  assigneeId: id.optional(),
  category: z.enum(categories).optional(),
  status: z.string().min(1).max(128).optional(),
  priority: z
    .enum(["no-priority", "low", "medium", "high", "urgent"])
    .optional(),
  label: z.string().min(1).max(200).optional(),
  search: z.string().trim().max(200).optional(),
});
export const cycleTaskSchema = z.object({
  id,
  projectId: id,
  projectName: z.string(),
  projectSlug: z.string(),
  title: z.string(),
  number: z.number().nullable(),
  status: z.string(),
  statusName: z.string(),
  category: z.enum(categories),
  priority: z.string(),
  userId: id.nullable(),
  assigneeName: z.string().nullable(),
  estimate: z.number().nullable(),
  dueDate: nullableResponseTimestamp,
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
});
export type SettingsPatch = z.infer<typeof settingsBody>;
export type CyclePatch = z.infer<typeof cyclePatch>;
export type CycleQuery = z.infer<typeof cycleQuery>;
export type CycleTaskQuery = z.infer<typeof cycleTaskQuery>;
