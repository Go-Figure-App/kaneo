import {
  nullableResponseTimestamp,
  pagingNumber,
  responseTimestamp,
  z,
} from "../../openapi";

export const id = z.string().min(1).max(128);
export const health = z.enum(["on_track", "at_risk", "off_track"]);
export const projectStatus = z.enum([
  "backlog",
  "planned",
  "started",
  "paused",
  "completed",
  "canceled",
]);
export const initiativeStatus = z.enum(["planned", "active", "completed"]);
export const parentType = z.enum(["project", "initiative"]);
const priority = z.enum(["no-priority", "low", "medium", "high", "urgent"]);
const position = z.number().int().min(0).max(1_000_000);
export const pageQuery = z.object({
  page: pagingNumber(1, 100_000, 1),
  pageSize: pagingNumber(1, 100, 50),
});
export const planBody = z.object({
  status: projectStatus.optional(),
  leadId: id.nullable().optional(),
  startDate: z.iso.date().nullable().optional(),
  targetDate: z.iso.date().nullable().optional(),
  priority: priority.optional(),
});
export const milestoneBody = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(50_000).default(""),
  targetDate: z.iso.date().nullable().optional(),
  position: position.optional(),
});
export const milestonePatch = milestoneBody.partial();
export const initiativeBody = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(50_000).default(""),
  status: initiativeStatus.optional(),
  ownerId: id.nullable().optional(),
  targetDate: z.iso.date().nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});
export const initiativePatch = initiativeBody
  .partial()
  .extend({ archived: z.boolean().optional() });
export const updateBody = z.object({
  health,
  body: z.string().trim().min(1).max(50_000),
});
export const progressSchema = z.object({
  completed: z.number(),
  total: z.number(),
  percent: z.number(),
  completedPoints: z.number().nullable(),
  totalPoints: z.number().nullable(),
  pointsPercent: z.number().nullable(),
});
export const statusUpdateSchema = z.object({
  id,
  parentType,
  parentId: id,
  authorId: id.nullable(),
  authorName: z.string().nullable(),
  health,
  body: z.string(),
  createdAt: responseTimestamp,
});
export const milestoneSchema = z.object({
  id,
  projectId: id,
  name: z.string(),
  description: z.string(),
  targetDate: z.iso.date().nullable(),
  position: z.number(),
  createdAt: responseTimestamp,
  updatedAt: responseTimestamp,
  progress: progressSchema,
});
export const projectSummarySchema = z.object({
  id,
  workspaceId: id,
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  status: projectStatus,
  health,
  leadId: id.nullable(),
  leadName: z.string().nullable(),
  startDate: z.iso.date().nullable(),
  targetDate: z.iso.date().nullable(),
  priority,
  progress: progressSchema,
  latestUpdate: statusUpdateSchema.nullable(),
});
export const projectPlanSchema = projectSummarySchema.extend({
  milestones: z.array(milestoneSchema),
});
export const initiativeSchema = z.object({
  id,
  workspaceId: id,
  name: z.string(),
  description: z.string(),
  status: initiativeStatus,
  health,
  ownerId: id.nullable(),
  ownerName: z.string().nullable(),
  targetDate: z.iso.date().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  position: z.number(),
  archivedAt: nullableResponseTimestamp,
  createdAt: responseTimestamp,
  updatedAt: responseTimestamp,
  progress: progressSchema,
  projectCount: z.number(),
  latestUpdate: statusUpdateSchema.nullable(),
});
export type PlanInput = z.infer<typeof planBody>;
export type MilestoneInput = z.infer<typeof milestoneBody>;
export type MilestonePatch = z.infer<typeof milestonePatch>;
export type InitiativeInput = z.infer<typeof initiativeBody>;
export type InitiativePatch = z.infer<typeof initiativePatch>;
export type UpdateInput = z.infer<typeof updateBody>;
export type ParentType = z.infer<typeof parentType>;
