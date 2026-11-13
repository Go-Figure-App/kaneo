import { expect, it } from "vite-plus/test";
import { displaySchema, filtersSchema, savedViewBody } from "./schema";
it("rejects invalid filter fields, comparisons and oversized criteria", () => {
  for (const value of [
    [{ field: "title", operator: "is", values: ["secret"] }],
    [{ field: "due", operator: "before", value: null }],
    [{ field: "estimate", operator: "after", value: null }],
    [{ field: "category", operator: "is", values: ["done"] }],
    [{ field: "assignee", operator: "is", values: [] }],
    [{ field: "completed", operator: "is", value: "2026-02-30" }],
    Array.from({ length: 31 }, () => ({
      field: "priority",
      operator: "is",
      values: ["urgent"],
    })),
  ])
    expect(filtersSchema.safeParse(value).success).toBe(false);
});
it("defaults personal views and validates independent display choices", () => {
  expect(savedViewBody.parse({ name: "My work" })).toMatchObject({
    shared: false,
    projectId: null,
    filters: [],
    display: { layout: "list", groupBy: "state" },
  });
  expect(
    displaySchema.parse({
      layout: "board",
      groupBy: "cycle",
      orderBy: "due",
      properties: [],
    }),
  ).toMatchObject({ properties: [] });
  expect(
    savedViewBody.safeParse({ name: "View", ownerId: "another-user" }).success,
  ).toBe(false);
});
