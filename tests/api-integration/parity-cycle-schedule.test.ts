import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  cycleDayTable,
  cycleTable,
  taskExtTable,
  workspaceExtTable,
} from "../../apps/api/src/database/schema-parity";
import { lockCycleWorkspace } from "../../apps/api/src/parity/cycles/access";
import { advanceCycles } from "../../apps/api/src/parity/cycles/advance";
import { cycleSettings } from "../../apps/api/src/parity/cycles/settings-read";
import { resetTestDatabase } from "./helpers/database";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "cycles");
});
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const c = await createRestrictedWorkspace();
  await db.insert(workspaceExtTable).values({
    workspaceId: c.workspace.id,
    cyclesEnabled: true,
    cycleWeeks: 1,
    estimateScale: "fibonacci",
  });
  const tick = (now: string, timeZone = "America/New_York") =>
    db.transaction(async (tx) => {
      await lockCycleWorkspace(tx, c.workspace.id);
      return advanceCycles(
        tx,
        { ...(await cycleSettings(c.workspace.id, tx)), timeZone },
        new Date(now),
      );
    });
  const cycles = () =>
    db
      .select()
      .from(cycleTable)
      .where(eq(cycleTable.workspaceId, c.workspace.id))
      .orderBy(cycleTable.number);
  const days = () => db.select().from(cycleDayTable).orderBy(cycleDayTable.day);
  return { ...c, tick, cycles, days };
}

it("creates the current and configured upcoming cycles at local midnight and repeats without writes", async () => {
  const c = await setup();
  expect(await c.tick("2026-03-04T12:00:00Z")).toMatchObject({ changed: true });
  const before = await c.cycles();
  expect(before).toHaveLength(3);
  expect(before[0]).toMatchObject({
    number: 1,
    startsAt: new Date("2026-03-02T05:00:00Z"),
    endsAt: new Date("2026-03-09T04:00:00Z"),
  });
  expect(before[1]?.startsAt).toEqual(before[0]?.endsAt);
  expect(await c.days()).toEqual([
    expect.objectContaining({ day: "2026-03-04", scopeCount: 0 }),
  ]);
  expect(await c.tick("2026-03-04T12:00:00Z")).toEqual({
    changed: false,
    catchingUp: false,
    rolledOver: [],
  });
  expect(await c.cycles()).toEqual(before);
});

it("closes once, preserves completed/canceled tasks and rolls unfinished tasks with system activity", async () => {
  const c = await setup();
  await c.tick("2026-11-12T12:00:00Z");
  const [current, next] = await c.cycles();
  const [canceled] = await db
    .insert(schema.taskTable)
    .values({
      projectId: c.alpha.id,
      number: 2,
      title: "Canceled",
      status: "canceled",
    })
    .returning();
  const [doneColumn] = await db
    .select()
    .from(schema.columnTable)
    .where(
      and(
        eq(schema.columnTable.projectId, c.beta.id),
        eq(schema.columnTable.isFinal, true),
      ),
    );
  await db
    .update(schema.taskTable)
    .set({ status: doneColumn!.slug, columnId: doneColumn!.id })
    .where(eq(schema.taskTable.id, c.betaTask.id));
  await db.insert(taskExtTable).values([
    { taskId: c.alphaTask.id, cycleId: current!.id, estimate: 3 },
    { taskId: c.betaTask.id, cycleId: current!.id, estimate: 5 },
    { taskId: canceled!.id, cycleId: current!.id, estimate: 8 },
  ]);
  await c.tick("2026-11-12T13:00:00Z");
  expect(await c.days()).toEqual([
    expect.objectContaining({
      scopeCount: 2,
      scopePoints: 8,
      completedCount: 1,
      completedPoints: 5,
    }),
  ]);
  const result = await c.tick("2026-11-16T05:00:00Z");
  expect(result.rolledOver).toEqual([
    { taskId: c.alphaTask.id, projectId: c.alpha.id },
  ]);
  expect((await c.cycles())[0]).toMatchObject({
    completedAt: new Date("2026-11-16T05:00:00Z"),
    summary: {
      scopeCount: 2,
      scopePoints: 8,
      completedCount: 1,
      completedPoints: 5,
      rolledOverCount: 1,
      rolledOverPoints: 3,
    },
  });
  const ext = await db.select().from(taskExtTable);
  expect(ext.find((row) => row.taskId === c.alphaTask.id)?.cycleId).toBe(
    next!.id,
  );
  expect(ext.find((row) => row.taskId === c.betaTask.id)?.cycleId).toBe(
    current!.id,
  );
  expect(ext.find((row) => row.taskId === canceled!.id)?.cycleId).toBe(
    current!.id,
  );
  const activities = await db
    .select()
    .from(schema.activityTable)
    .where(eq(schema.activityTable.type, "cycle_changed"));
  expect(activities).toEqual([
    expect.objectContaining({
      taskId: c.alphaTask.id,
      userId: null,
      eventData: {
        oldCycleId: current!.id,
        cycleId: next!.id,
        rolledOver: true,
      },
    }),
  ]);
  expect(await c.tick("2026-11-16T05:00:00Z")).toMatchObject({
    changed: false,
    rolledOver: [],
  });
  expect(await c.days()).toHaveLength(2);
});

it("keeps cooldown weeks empty and respects disabled automatic rollover", async () => {
  const c = await setup();
  await db
    .update(workspaceExtTable)
    .set({ cooldownWeeks: 1, autoRollover: false })
    .where(eq(workspaceExtTable.workspaceId, c.workspace.id));
  await c.tick("2026-11-12T12:00:00Z");
  const [current, next] = await c.cycles();
  expect(next?.startsAt).toEqual(new Date("2026-11-23T05:00:00Z"));
  await db
    .insert(taskExtTable)
    .values({ taskId: c.alphaTask.id, cycleId: current!.id });
  expect(await c.tick("2026-11-17T12:00:00Z")).toMatchObject({
    rolledOver: [],
  });
  expect((await c.cycles())[0]?.summary).toMatchObject({
    scopeCount: 1,
    rolledOverCount: 0,
  });
  expect((await db.select().from(taskExtTable))[0]?.cycleId).toBe(current!.id);
  expect(await c.days()).toHaveLength(1);
});

it("catches up missed cycles without fabricating daily history", async () => {
  const c = await setup();
  await c.tick("2026-11-12T12:00:00Z");
  const [current] = await c.cycles();
  await db
    .insert(taskExtTable)
    .values({ taskId: c.alphaTask.id, cycleId: current!.id });
  const result = await c.tick("2026-12-02T12:00:00Z");
  expect(result.catchingUp).toBe(false);
  expect(result.rolledOver).toHaveLength(3);
  const cycles = await c.cycles();
  expect(cycles.filter((cycle) => cycle.completedAt)).toHaveLength(3);
  expect(
    cycles.filter((cycle) => cycle.startsAt > new Date("2026-12-02T12:00:00Z")),
  ).toHaveLength(2);
  expect((await c.days()).map((day) => day.day)).toEqual([
    "2026-11-12",
    "2026-12-02",
  ]);
});

it("serializes concurrent ticks and ignores archived or moved project assignments", async () => {
  const c = await setup();
  await c.tick("2026-11-12T12:00:00Z");
  const [current] = await c.cycles();
  await db.insert(taskExtTable).values([
    { taskId: c.alphaTask.id, cycleId: current!.id },
    { taskId: c.betaTask.id, cycleId: current!.id },
  ]);
  await db
    .update(schema.projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.projectTable.id, c.beta.id));
  const results = await Promise.all([
    c.tick("2026-11-16T05:00:00Z"),
    c.tick("2026-11-16T05:00:00Z"),
  ]);
  expect(results.map((result) => result.rolledOver.length).sort()).toEqual([
    0, 1,
  ]);
  expect((await c.cycles())[0]?.summary).toMatchObject({
    scopeCount: 1,
    rolledOverCount: 1,
  });
  expect(
    await db
      .select()
      .from(schema.activityTable)
      .where(eq(schema.activityTable.type, "cycle_changed")),
  ).toHaveLength(1);
});

it("does nothing while cycles are disabled", async () => {
  const c = await setup();
  await db
    .update(workspaceExtTable)
    .set({ cyclesEnabled: false })
    .where(eq(workspaceExtTable.workspaceId, c.workspace.id));
  expect(await c.tick("2026-11-12T12:00:00Z")).toMatchObject({
    changed: false,
  });
  expect(await c.cycles()).toEqual([]);
  expect(await c.days()).toEqual([]);
});
