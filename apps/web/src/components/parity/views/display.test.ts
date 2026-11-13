import { expect, it } from "vite-plus/test";
import type { WorkspaceTask } from "@/fetchers/parity/views";
import { groupWorkspaceTasks } from "./display";
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
