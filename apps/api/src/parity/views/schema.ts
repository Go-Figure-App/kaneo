import { nullableResponseTimestamp, responseTimestamp, z } from "../../openapi";
import { categories } from "../foundation/categories";
import { id, pageQuery } from "../planning/schema";

export const priorities = [
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
] as const;
const equality = z.enum(["is", "is-not"]);
const comparison = z.enum(["is", "is-not", "before", "after"]);
export const taskFilter = z
  .discriminatedUnion("field", [
    z.strictObject({
      field: z.literal("category"),
      operator: equality,
      values: z.array(z.enum(categories)).min(1).max(5),
    }),
    z.strictObject({
      field: z.literal("priority"),
      operator: equality,
      values: z.array(z.enum(priorities)).min(1).max(5),
    }),
    z.strictObject({
      field: z.enum(["assignee", "creator", "project", "cycle", "milestone"]),
      operator: equality,
      values: z.array(id.nullable()).min(1).max(50),
    }),
    z.strictObject({
      field: z.literal("label"),
      operator: equality,
      values: z.array(z.string().min(1).max(200).nullable()).min(1).max(50),
    }),
    z.strictObject({
      field: z.literal("estimate"),
      operator: comparison,
      value: z.number().int().min(0).max(1_000_000).nullable(),
    }),
    z.strictObject({
      field: z.enum(["due", "created", "completed"]),
      operator: comparison,
      value: z.iso.date().nullable(),
    }),
  ])
  .refine(
    (filter) =>
      !["before", "after"].includes(filter.operator) ||
      ("value" in filter && filter.value !== null),
    { message: "Comparisons require a value" },
  );
export const filtersSchema = z
  .array(taskFilter)
  .max(30)
  .describe(
    "At most 30 filters, whose JSON occupies at most 6000 characters after URL encoding",
  )
  .refine(
    (filters) => encodeURIComponent(JSON.stringify(filters)).length <= 6_000,
    { message: "Encoded filters must not exceed 6000 characters" },
  );
export type TaskFilter = z.infer<typeof taskFilter>;
export const displaySchema = z.strictObject({
  layout: z.enum(["list", "board"]).default("list"),
  groupBy: z
    .enum(["state", "assignee", "project", "priority", "cycle", "label"])
    .default("state"),
  orderBy: z
    .enum(["priority", "created", "updated", "due"])
    .default("priority"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  properties: z
    .array(
      z.enum([
        "identifier",
        "status",
        "priority",
        "assignee",
        "project",
        "cycle",
        "milestone",
        "estimate",
        "labels",
        "due",
      ]),
    )
    .max(10)
    .default(["identifier", "priority", "assignee", "project", "labels"]),
});
export type ViewDisplay = z.infer<typeof displaySchema>;
export type ViewFilters = z.infer<typeof filtersSchema>;
export const workspaceTaskQuery = pageQuery
  .extend({
    filters: z.string().max(16_000).optional(),
    search: z.string().trim().max(200).optional(),
    orderBy: z
      .enum(["priority", "created", "updated", "due"])
      .default("priority"),
    direction: z.enum(["asc", "desc"]).default("asc"),
    projectId: id.optional(),
  })
  .strict();
export type WorkspaceTaskQuery = z.infer<typeof workspaceTaskQuery>;
export const workspaceTaskSchema = z.strictObject({
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
  creatorId: id.nullable(),
  cycleId: id.nullable(),
  cycleName: z.string().nullable(),
  milestoneId: id.nullable(),
  milestoneName: z.string().nullable(),
  estimate: z.number().nullable(),
  labels: z.array(z.strictObject({ name: z.string(), color: z.string() })),
  dueDate: nullableResponseTimestamp,
  createdAt: responseTimestamp,
  updatedAt: responseTimestamp,
  completedAt: nullableResponseTimestamp,
});
export const savedViewBody = z.strictObject({
  name: z.string().trim().min(1).max(200),
  icon: z.string().max(100).nullable().default(null),
  projectId: id.nullable().default(null),
  shared: z.boolean().default(false),
  filters: filtersSchema.default([]),
  display: displaySchema.default(() => displaySchema.parse({})),
});
export type SavedViewInput = z.infer<typeof savedViewBody>;
export const savedViewSchema = savedViewBody.extend({
  id,
  workspaceId: id,
  ownerId: id,
  canEdit: z.boolean(),
});
export const favoriteKinds = [
  "view",
  "project",
  "initiative",
  "cycle",
  "task",
] as const;
export const favoriteTarget = z.strictObject({
  kind: z.enum(favoriteKinds),
  targetId: id,
});
export type FavoriteTarget = z.infer<typeof favoriteTarget>;
export const favoriteSchema = favoriteTarget.extend({
  position: z.number(),
  title: z.string(),
  projectId: id.nullable(),
});
export const templateDefaults = z.strictObject({
  priority: z.enum(priorities).default("no-priority"),
  labels: z.array(z.string().min(1).max(200)).max(50).default([]),
  assigneeId: id.nullable().default(null),
  estimate: z.number().int().min(0).max(1_000_000).nullable().default(null),
});
export type TemplateDefaults = z.infer<typeof templateDefaults>;
export const templateBody = z.strictObject({
  name: z.string().trim().min(1).max(200),
  title: z.string().max(500),
  description: z.string().max(50_000),
  defaults: templateDefaults,
});
export type TemplateInput = z.infer<typeof templateBody>;
export const templateSchema = templateBody.extend({ projectId: id });
