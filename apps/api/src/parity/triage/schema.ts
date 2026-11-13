import {
  pagingNumber,
  responseTimestamp,
  nullableResponseTimestamp,
  z,
} from "../../openapi";
import { taskRecurrenceSchema } from "../../task/recurrence/schema";

export const id = z.string().min(1).max(128);
export const priority = z.enum([
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
]);
const submissionBody = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(50_000).default(""),
});
export const createTriageBody = submissionBody.extend({
  userId: id.optional(),
  priority: priority.optional(),
  startDate: z
    .union([z.iso.date(), z.iso.datetime({ offset: true })])
    .optional(),
  dueDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]).optional(),
  recurrence: taskRecurrenceSchema.optional(),
  draftAssetIds: z.array(id).max(100).optional(),
  customFields: z
    .array(z.object({ fieldId: id, value: z.string().max(50_000) }))
    .max(100)
    .optional(),
});
export const intakeBody = submissionBody.extend({
  reporterEmail: z.email().max(254),
});
export const acceptBody = z.object({
  columnId: id,
  assigneeId: id.nullable().optional(),
  priority: priority.optional(),
  cycleId: id.nullable().optional(),
});
export const declineBody = z.object({
  comment: z.string().trim().min(1).max(10_000),
});
export const duplicateBody = z.object({ duplicateOfTaskId: id });
export const snoozeBody = z.object({ until: z.iso.datetime({ offset: true }) });
export const settingsBody = z.object({
  enabled: z.boolean().optional(),
  ownerId: id.nullable().optional(),
  rotateIntakeToken: z.boolean().optional(),
  integrations: z
    .array(z.object({ id, enabled: z.boolean() }))
    .max(3)
    .optional(),
});
export const listQuery = z.object({
  projectId: id.optional(),
  page: pagingNumber(1, 100_000, 1),
  pageSize: pagingNumber(1, 100, 50),
});
export const triageItemSchema = z.object({
  id,
  projectId: id,
  title: z.string(),
  number: z.number().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  userId: id.nullable(),
  assigneeName: z.string().nullable(),
  projectName: z.string(),
  projectSlug: z.string(),
  createdAt: responseTimestamp,
  source: z.string().nullable(),
  snoozedUntil: nullableResponseTimestamp,
});
export const settingsSchema = z.object({
  enabled: z.boolean(),
  ownerId: id.nullable(),
  intakeToken: z.string().nullable(),
  integrations: z.array(
    z.object({ id, type: z.string(), enabled: z.boolean() }),
  ),
});
export type CreateTriageInput = z.infer<typeof createTriageBody>;
export type AcceptInput = z.infer<typeof acceptBody>;
export type SettingsInput = z.infer<typeof settingsBody>;
