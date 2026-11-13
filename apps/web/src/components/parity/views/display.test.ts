import { expect, it } from "vite-plus/test";
import type { WorkspaceTask } from "@/fetchers/parity/views";
import { groupWorkspaceTasks, validFilters } from "./display";
import { templateLabels } from "./template-labels";
it("rejects invalid estimate filters and filters too large for a request URL", () => {
  for (const value of [-1, 0.5, 1_000_001, Number.NaN, Infinity])
    expect(validFilters([{ field: "estimate", operator: "is", value }])).toBe(
      false,
    );
  for (const value of [null, 0, 1_000_000])
    expect(validFilters([{ field: "estimate", operator: "is", value }])).toBe(
      true,
    );
  expect(
    validFilters([{ field: "estimate", operator: "after", value: null }]),
  ).toBe(false);
  expect(
    validFilters([
      {
        field: "label",
        operator: "is",
        values: Array(50).fill("界".repeat(200)),
      },
    ]),
  ).toBe(false);
});
it("selects each template label once, preferring the workspace row", () => {
  const rows = [
    { name: "Release", taskId: "task-a", id: "a" },
    { name: "Mobile", taskId: "task-b", id: "b" },
    { name: "Release", taskId: null, id: "workspace" },
    { name: "Release", taskId: "task-c", id: "c" },
    { name: "Unselected", taskId: null, id: "other" },
  ];
  expect(templateLabels(rows, ["Release", "Mobile"])).toEqual([
    rows[2],
    rows[1],
  ]);
});
it("keeps project-local states separate and includes issues in each of their label groups", () => {
  const first = {
    id: "one",
    projectId: "p1",
    projectName: "First",
    status: "todo",
    statusName: "Todo",
    category: "unstarted",
    labels: [
      { name: "Release", color: "red" },
      { name: "Mobile", color: "blue" },
    ],
  } as WorkspaceTask;
  const second = {
    ...first,
    id: "two",
    projectId: "p2",
    projectName: "Second",
    labels: [],
  };
  const states = groupWorkspaceTasks([first, second], "state", "None");
  expect(states.map((group) => group.name)).toEqual([
    "First · Todo",
    "Second · Todo",
  ]);
  expect(states.map((group) => group.tasks.length)).toEqual([1, 1]);
  const labels = groupWorkspaceTasks([first, second], "label", "None");
  expect(
    labels.map((group) => [group.name, group.tasks.map((task) => task.id)]),
  ).toEqual([
    ["Release", ["one"]],
    ["Mobile", ["one"]],
    ["None", ["two"]],
  ]);
});
