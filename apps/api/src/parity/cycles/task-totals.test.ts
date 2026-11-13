import { expect, it } from "vite-plus/test";
import { taskTotalsByProject } from "./totals";

it("captures scope and terminal state from the same task snapshot", () => {
  const tasks = [
    { projectId: "a", category: "unstarted", estimate: null },
    { projectId: "a", category: "started", estimate: 3 },
    { projectId: "a", category: "completed", estimate: 5 },
    { projectId: "a", category: "canceled", estimate: 8 },
    { projectId: "b", category: "completed", estimate: 0 },
  ];
  expect(taskTotalsByProject(tasks, "fibonacci").get("a")).toEqual({
    scopeCount: 3,
    scopePoints: 9,
    startedCount: 1,
    startedPoints: 3,
    completedCount: 1,
    completedPoints: 5,
  });
  expect(taskTotalsByProject(tasks, "fibonacci").get("b")).toMatchObject({
    completedCount: 1,
    completedPoints: 0,
  });
  expect(taskTotalsByProject(tasks, "none").get("a")).toMatchObject({
    scopePoints: 3,
    completedPoints: 1,
    startedPoints: 1,
  });
});
