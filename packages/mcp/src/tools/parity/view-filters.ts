import { z } from "zod";
// Wire contract for /api/parity/tasks. Kept independent of the API package so
// the published stdio server does not depend on server/database modules.
const equality = z.enum(["is", "is-not"]);
const comparison = z.enum(["is", "is-not", "before", "after"]);
const id = z.string().min(1).max(128);
export const viewFilters = z
  .array(
    z
      .discriminatedUnion("field", [
        z.strictObject({
          field: z.literal("category"),
          operator: equality,
          values: z
            .array(
              z.enum([
                "backlog",
                "unstarted",
                "started",
                "completed",
                "canceled",
              ]),
            )
            .min(1)
            .max(5),
        }),
        z.strictObject({
          field: z.literal("priority"),
          operator: equality,
          values: z
            .array(z.enum(["no-priority", "low", "medium", "high", "urgent"]))
            .min(1)
            .max(5),
        }),
        z.strictObject({
          field: z.enum([
            "assignee",
            "creator",
            "project",
            "cycle",
            "milestone",
          ]),
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
      ),
  )
  .max(30);
