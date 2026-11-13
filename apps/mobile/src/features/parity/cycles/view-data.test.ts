import { expect, it } from "vite-plus/test";
import { groupCycleTasks } from "./group-tasks";
import type { CycleTask } from "./types";
import type { CycleDetail } from "./types";
import {
  burndown,
  calendarDay,
  completion,
  daysLeft,
  formatCalendarDay,
} from "./chart";

const totals = {
  scopeCount: 4,
  scopePoints: 10,
  startedCount: 1,
  startedPoints: 3,
  completedCount: 2,
  completedPoints: 6,
};
function cycle(overrides: Partial<CycleDetail> = {}): CycleDetail {
  return {
    id: "cycle",
    workspaceId: "workspace",
    number: 1,
    name: null,
    startsAt: "2026-10-26T04:00:00Z",
    endsAt: "2026-11-02T05:00:00Z",
    completedAt: null,
    createdAt: "2026-10-20T00:00:00Z",
    updatedAt: "2026-10-20T00:00:00Z",
    phase: "current",
    progress: totals,
    summary: null,
    historyAvailable: true,
    settings: {
      workspaceId: "workspace",
      timeZone: "America/New_York",
      estimateScale: "fibonacci",
      cyclesEnabled: true,
      cycleWeeks: 1,
      cooldownWeeks: 0,
      cycleStartDay: 1,
      upcomingCycles: 2,
      autoRollover: true,
    },
    days: [
      { day: "2026-10-26", ...totals, completedCount: 0, completedPoints: 0 },
      { day: "2026-10-30", ...totals, scopePoints: 12 },
    ],
    ...overrides,
  };
}
it("uses local calendar days across daylight saving and preserves scope changes without inventing missed snapshots", () => {
  const chart = burndown(cycle(), new Date("2026-11-01T17:00:00Z"));
  expect(chart.observed.map((row) => row.day)).toEqual([
    "2026-10-26",
    "2026-10-30",
    "2026-11-01",
  ]);
  expect(chart.observed[2]?.x).toBeCloseTo(6 / 7);
  expect(chart.observed.map((row) => row.remaining)).toEqual([10, 6, 4]);
  expect(chart.maximum).toBe(12);
  expect(calendarDay("2026-11-02T02:00:00Z", "America/New_York")).toBe(
    "2026-11-01",
  );
});
it("uses immutable close totals after rollover and falls back to counts when estimates are disabled", () => {
  const data = cycle({
    phase: "past",
    completedAt: "2026-11-02T05:00:00Z",
    progress: { ...totals, scopeCount: 2, scopePoints: 6 },
    summary: { ...totals, rolledOverCount: 2, rolledOverPoints: 4 },
  });
  expect(burndown(data).observed.at(-1)).toEqual({
    day: "2026-11-02",
    x: 1,
    scope: 10,
    remaining: 4,
  });
  data.settings.estimateScale = "none";
  expect(burndown(data).observed.at(-1)?.remaining).toBe(2);
  expect(completion(totals, false)).toBe(50);
  expect(completion(totals, true)).toBe(60);
  expect(
    completion({ ...totals, scopePoints: 0, completedPoints: 0 }, true),
  ).toBe(50);
});
it("does not add live observations to upcoming cycles", () => {
  expect(burndown(cycle({ phase: "upcoming", days: [] })).observed).toEqual([]);
  expect(calendarDay("0001-01-01T00:00:00Z", "UTC")).toBe("0001-01-01");
});

it("counts remaining local dates rather than 24-hour blocks through daylight saving", () => {
  expect(
    daysLeft(
      "2026-11-02T05:00:00Z",
      "America/New_York",
      new Date("2026-10-26T04:00:00Z"),
    ),
  ).toBe(7);
  expect(
    daysLeft(
      "2026-11-02T05:00:00Z",
      "America/New_York",
      new Date("2026-11-02T04:30:00Z"),
    ),
  ).toBe(1);
  expect(
    daysLeft(
      "2026-11-02T05:00:00Z",
      "America/New_York",
      new Date("2026-11-02T05:00:00Z"),
    ),
  ).toBe(0);
});

it("formats calendar labels without shifting the observed day", () => {
  expect(formatCalendarDay("2026-11-02", "en-US")).toBe("Nov 2, 2026");
  expect(formatCalendarDay("2026-11-02", "de-DE")).toBe("2. Nov. 2026");
});

it("keeps project-local statuses distinct without changing assignee or project grouping", () => {
  const task: CycleTask = {
    id: "task-a",
    projectId: "project-a",
    projectName: "Alpha",
    projectSlug: "ALP",
    title: "First",
    number: 1,
    status: "todo",
    statusName: "Ready",
    category: "unstarted",
    priority: "medium",
    userId: null,
    assigneeName: null,
    estimate: null,
    dueDate: null,
    labels: [],
  };
  const tasks = [
    task,
    {
      ...task,
      id: "task-b",
      projectId: "project-b",
      projectName: "Beta",
      statusName: "Queued",
    },
  ];
  expect(
    groupCycleTasks(tasks, "state", "Unassigned").map(
      ({ id, name, tasks }) => ({
        id,
        name,
        ids: tasks.map((task) => task.id),
      }),
    ),
  ).toEqual([
    { id: "project-a:todo", name: "Ready", ids: ["task-a"] },
    { id: "project-b:todo", name: "Queued", ids: ["task-b"] },
  ]);
  expect(groupCycleTasks(tasks, "assignee", "Unassigned")).toEqual([
    { id: "unassigned", name: "Unassigned", tasks },
  ]);
  expect(
    groupCycleTasks(tasks, "project", "Unassigned").map((group) => group.name),
  ).toEqual(["Alpha", "Beta"]);
});
