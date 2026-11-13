import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  cycleDayTable,
  cycleTable,
  initiativeProjectTable,
  initiativeTable,
} from "../../apps/api/src/database/schema-parity";
import { emptyTotals } from "../../apps/api/src/parity/cycles/totals";
import { invalidateInsights } from "../../apps/api/src/parity/insights/cache";
import { getInsights } from "../../apps/api/src/parity/insights/read";
import { insightsSchema } from "../../apps/api/src/parity/insights/schema";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { insightsFixture } from "./helpers/parity-insights";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

const now = new Date("2026-11-13T12:00:00Z");
beforeEach(async () => {
  await resetTestDatabase();
  invalidateInsights();
  vi.stubEnv("PARITY_FEATURES", "insights");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  invalidateInsights();
});

it("filters immutable cycle totals and computes a three-cycle average without exposing hidden projects", async () => {
  const c = await insightsFixture();
  const visible = {
    ...emptyTotals(),
    scopeCount: 4,
    scopePoints: 10,
    completedCount: 3,
    completedPoints: 8,
    rolledOverCount: 1,
    rolledOverPoints: 2,
  };
  const hidden = { ...visible, scopePoints: 1000, completedPoints: 999 };
  await db.insert(cycleTable).values(
    [0, 1, 2].map((index) => ({
      workspaceId: c.workspace.id,
      number: index + 2,
      startsAt: new Date(
        [
          "2026-10-19T04:00:00Z",
          "2026-10-26T04:00:00Z",
          "2026-11-02T05:00:00Z",
        ][index]!,
      ),
      endsAt:
        index === 0
          ? new Date("2026-10-26T04:00:00Z")
          : index === 1
            ? new Date("2026-11-02T05:00:00Z")
            : new Date("2026-11-09T05:00:00Z"),
      completedAt: now,
      summary: {
        ...hidden,
        projectTotals: {
          [c.alpha.id]: { ...visible, completedPoints: index + 4 },
          [c.beta.id]: hidden,
        },
      },
    })),
  );
  mockAuthenticatedSession(c.restricted);
  const response = await projectAccessApi()(
    `/parity/insights/${c.workspace.id}?measure=velocity&from=2026-10-01&to=2026-11-13`,
  );
  expect(response.status).toBe(200);
  const report = insightsSchema.parse(await response.json());
  expect(
    report.rows
      .filter((row) => row.series === "completed")
      .map((row) => row.points),
  ).toEqual([4, 5, 6, 8]);
  expect(report.rows.findLast((row) => row.series === "average")).toMatchObject(
    { points: 5, samples: 3 },
  );
  expect(JSON.stringify(report)).not.toContain(c.beta.id);
  expect(JSON.stringify(report)).not.toContain("999");
  const current = await getInsights(
    { userId: c.restricted.id, workspaceId: c.workspace.id },
    { measure: "velocity", cycleId: c.cycle.id },
    now,
  );
  expect(current.rows.find((row) => row.series === "average")).toMatchObject({
    points: 5,
    samples: 3,
  });
});

it("uses filtered daily scope and marks aggregate-only or missing start history unavailable", async () => {
  const c = await insightsFixture();
  const visible = { ...emptyTotals(), scopeCount: 2, scopePoints: 8 };
  const hidden = { ...emptyTotals(), scopeCount: 20, scopePoints: 1000 };
  await db.insert(cycleDayTable).values({
    cycleId: c.cycle.id,
    day: "2026-11-09",
    ...hidden,
    projectTotals: { [c.alpha.id]: visible, [c.beta.id]: hidden },
  });
  const who = { userId: c.restricted.id, workspaceId: c.workspace.id };
  const report = await getInsights(
    who,
    { measure: "burndown", cycleId: c.cycle.id },
    now,
  );
  expect(report.partialHistory).toBe(false);
  expect(
    report.rows.find(
      (row) => row.series === "remaining" && row.key === "2026-11-09",
    ),
  ).toMatchObject({ value: 2, points: 8 });
  expect(
    report.rows.find(
      (row) => row.series === "ideal" && row.key === "2026-11-16",
    ),
  ).toMatchObject({ value: 0, points: 0 });
  await db
    .update(cycleDayTable)
    .set({ projectTotals: {} })
    .where(eq(cycleDayTable.cycleId, c.cycle.id));
  await db
    .update(cycleTable)
    .set({
      completedAt: now,
      summary: { ...hidden, rolledOverCount: 0, rolledOverPoints: 0 },
    })
    .where(eq(cycleTable.id, c.cycle.id));
  invalidateInsights();
  const imported = await getInsights(
    who,
    { measure: "burndown", cycleId: c.cycle.id },
    now,
  );
  expect(imported.historyAvailable).toBe(false);
  expect(imported.partialHistory).toBe(true);
  expect(imported.rows).toEqual([]);
});

it("compares first-day and closing scope using the selected initiative's readable projects", async () => {
  const c = await insightsFixture();
  const start = { ...emptyTotals(), scopeCount: 2, scopePoints: 8 };
  const end = {
    ...start,
    scopeCount: 3,
    scopePoints: 9,
    completedCount: 2,
    completedPoints: 8,
    rolledOverCount: 1,
    rolledOverPoints: 1,
  };
  await db.insert(cycleDayTable).values({
    cycleId: c.cycle.id,
    day: "2026-11-09",
    ...start,
    projectTotals: { [c.alpha.id]: start },
  });
  await db
    .update(cycleTable)
    .set({
      completedAt: now,
      summary: { ...end, projectTotals: { [c.alpha.id]: end } },
    })
    .where(eq(cycleTable.id, c.cycle.id));
  const [initiative] = await db
    .insert(initiativeTable)
    .values({ workspaceId: c.workspace.id, name: "Delivery" })
    .returning();
  await db
    .insert(initiativeProjectTable)
    .values({ initiativeId: initiative!.id, projectId: c.alpha.id });
  mockAuthenticatedSession(c.restricted);
  const response = await projectAccessApi()(
    `/parity/insights/${c.workspace.id}?measure=scope-change&initiativeId=${initiative!.id}`,
  );
  expect(response.status).toBe(200);
  expect(insightsSchema.parse(await response.json()).rows).toMatchObject([
    { series: "start", value: 2, points: 8 },
    { series: "end", value: 3, points: 9 },
  ]);
});

it("averages recorded time in state without inventing missing task histories", async () => {
  const c = await insightsFixture();
  await db.insert(schema.activityTable).values([
    {
      taskId: c.alphaTask.id,
      type: "status_changed",
      createdAt: new Date("2026-11-08T12:00:00Z"),
      eventData: { oldStatus: "to-do", newStatus: "in-progress" },
    },
    {
      taskId: c.alphaTask.id,
      type: "status_changed",
      createdAt: new Date("2026-11-10T12:00:00Z"),
      eventData: { oldStatus: "in-progress", newStatus: "done" },
    },
    {
      taskId: c.betaTask.id,
      type: "status_changed",
      createdAt: new Date("2026-11-02T12:00:00Z"),
      eventData: { oldStatus: "to-do", newStatus: "in-progress" },
    },
  ]);
  mockAuthenticatedSession(c.restricted);
  const response = await projectAccessApi()(
    `/parity/insights/${c.workspace.id}?measure=time-in-state&from=2026-11-01&to=2026-11-13`,
  );
  expect(response.status).toBe(200);
  const result = insightsSchema.parse(await response.json());
  expect(result.rows.find((row) => row.key === "started")).toMatchObject({
    value: 2,
    samples: 1,
  });
  expect(result.rows.find((row) => row.key === "unstarted")).toMatchObject({
    value: 7,
    samples: 1,
  });
  expect(result.partialHistory).toBe(true);
});
