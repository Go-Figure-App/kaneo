import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  cycleDayTable,
  cycleTable,
  taskExtTable,
  projectMilestoneTable,
} from "../../apps/api/src/database/schema-parity";
import { updateCycleSettings } from "../../apps/api/src/parity/cycles/settings-write";
import {
  cycleTick,
  tickWorkspaceCycles,
} from "../../apps/api/src/parity/cycles/tick";
import { reconcileCycleReferences } from "../../apps/api/src/parity/cycles/initialize";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "cycles");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function setup() {
  const c = await createRestrictedWorkspace();
  mockAuthenticatedSession(c.owner);
  const request = projectAccessApi();
  const who = { userId: c.owner.id, workspaceId: c.workspace.id };
  const send = async (path: string, method = "GET", body?: unknown) => {
    const response = await request(`/parity/${path}`, { method, body });
    const json = await response.json();
    expect(response.status, JSON.stringify(json)).toBe(200);
    return json;
  };
  const enable = () =>
    updateCycleSettings(
      who,
      {
        cyclesEnabled: true,
        cycleWeeks: 1,
        estimateScale: "fibonacci",
        timeZone: "UTC",
      },
      new Date("2026-11-12T12:00:00Z"),
    );
  const cycles = () =>
    db
      .select()
      .from(cycleTable)
      .where(eq(cycleTable.workspaceId, c.workspace.id))
      .orderBy(cycleTable.number);
  return { ...c, who, request, send, enable, cycles };
}

it("returns defaults, enables cycles, and validates timezone/cadence settings", async () => {
  const c = await setup();
  const path = `cycle/settings/${c.workspace.id}`;
  expect(await c.send(path)).toMatchObject({
    cyclesEnabled: false,
    timeZone: "UTC",
    cycleWeeks: 2,
    upcomingCycles: 2,
    estimateScale: "none",
  });
  for (const body of [
    { cycleWeek: 1 },
    { cyclesEnabled: true, unexpected: true },
    { timeZone: "invalid/zone" },
    { cycleWeeks: 0 },
    { cycleWeeks: 9 },
    { cycleStartDay: 7 },
    { upcomingCycles: 16 },
    { cooldownWeeks: -1 },
  ])
    expect(
      (await c.request(`/parity/${path}`, { method: "PUT", body })).status,
    ).toBe(400);
  expect(
    await c.send(path, "PUT", {
      cyclesEnabled: true,
      cycleWeeks: 1,
      timeZone: "America/New_York",
    }),
  ).toMatchObject({
    cyclesEnabled: true,
    cycleWeeks: 1,
    timeZone: "America/New_York",
  });
  const list = await c.send(`cycle/${c.workspace.id}?phase=current`);
  expect(list.items).toHaveLength(1);
  expect(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/New_York",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date(list.items[0].startsAt)),
  ).toBe("00");
  expect(
    (await c.send(`cycle/${c.workspace.id}?phase=upcoming`)).items,
  ).toHaveLength(2);
});

it("keeps active dates and upcoming IDs when cadence settings change", async () => {
  const c = await setup();
  await c.enable();
  const before = await c.cycles();
  await updateCycleSettings(
    c.who,
    { cycleWeeks: 2, cycleStartDay: 3, cooldownWeeks: 1 },
    new Date("2026-11-12T13:00:00Z"),
  );
  const after = await c.cycles();
  expect(after.map((cycle) => cycle.id)).toEqual(
    before.map((cycle) => cycle.id),
  );
  expect(after[0]?.startsAt).toEqual(before[0]?.startsAt);
  expect(after[0]?.endsAt).toEqual(before[0]?.endsAt);
  expect(after[1]).toMatchObject({
    startsAt: new Date("2026-11-25T00:00:00Z"),
    endsAt: new Date("2026-12-09T00:00:00Z"),
  });
  expect(after[2]?.startsAt).toEqual(new Date("2026-12-16T00:00:00Z"));
});

it("renames cycles and validates upcoming date edits without changing completed/current dates", async () => {
  const c = await setup();
  await c.send(`cycle/settings/${c.workspace.id}`, "PUT", {
    cyclesEnabled: true,
    cycleWeeks: 1,
  });
  const [current, upcoming] = await c.cycles();
  expect(
    await c.send(`cycle/item/${current!.id}`, "PUT", { name: "Launch week" }),
  ).toMatchObject({ name: "Launch week" });
  const startDate = new Date(+upcoming!.startsAt + 86_400_000)
    .toISOString()
    .slice(0, 10);
  expect(
    await c.send(`cycle/item/${upcoming!.id}`, "PUT", { startDate }),
  ).toMatchObject({ startsAt: `${startDate}T00:00:00.000Z` });
  for (const [id, body] of [
    [current!.id, { startDate }],
    [upcoming!.id, { startDate: "2020-01-01" }],
    [upcoming!.id, { startDate: "2026-02-30" }],
    [
      upcoming!.id,
      {
        endDate: new Date(+upcoming!.endsAt + 86_400_000)
          .toISOString()
          .slice(0, 10),
      },
    ],
  ] as const)
    expect(
      (await c.request(`/parity/cycle/item/${id}`, { method: "PUT", body }))
        .status,
    ).toBe(400);
  expect(
    await c.send(`cycle/item/${current!.id}`, "PUT", { name: null }),
  ).toMatchObject({ name: null });
});

it("filters immutable history by current project access, including after rollover and project deletion", async () => {
  const c = await setup();
  await c.enable();
  const [current] = await c.cycles();
  await c.send("task/bulk", "PATCH", {
    taskIds: [c.alphaTask.id, c.betaTask.id],
    operation: "updateCycle",
    value: current!.id,
  });
  await c.send(`task/${c.alphaTask.id}/estimate`, "PUT", { estimate: 3 });
  await c.send(`task/${c.betaTask.id}/estimate`, "PUT", { estimate: 8 });
  await tickWorkspaceCycles(c.workspace.id, new Date("2026-11-12T13:00:00Z"));
  await tickWorkspaceCycles(c.workspace.id, new Date("2026-11-16T00:00:00Z"));
  mockAuthenticatedSession(c.restricted);
  let detail = await c.send(`cycle/item/${current!.id}`);
  expect(detail).toMatchObject({
    summary: { scopeCount: 1, scopePoints: 3, rolledOverCount: 1 },
    progress: { scopeCount: 0 },
    historyAvailable: true,
  });
  expect(detail.days[0]).toMatchObject({ scopeCount: 1, scopePoints: 3 });
  expect(JSON.stringify(detail)).not.toContain(c.beta.id);
  expect(JSON.stringify(detail)).not.toContain("projectTotals");
  await restrictToProjects(c.workspace.id, c.restricted.id, [c.beta.id]);
  detail = await c.send(`cycle/item/${current!.id}`);
  expect(detail.summary).toMatchObject({ scopePoints: 8 });
  expect(detail.days[0]).toMatchObject({ scopePoints: 8 });
  await db
    .delete(schema.projectTable)
    .where(eq(schema.projectTable.id, c.beta.id));
  detail = await c.send(`cycle/item/${current!.id}`);
  expect(detail.summary).toMatchObject({ scopeCount: 0, scopePoints: 0 });
  expect(detail.days[0]).toMatchObject({ scopeCount: 0 });
});

it("does not expose imported aggregate-only history as project-filtered history", async () => {
  const c = await setup();
  await c.enable();
  const [current] = await c.cycles();
  await db
    .update(cycleDayTable)
    .set({ scopeCount: 42, scopePoints: 42, projectTotals: {} })
    .where(eq(cycleDayTable.cycleId, current!.id));
  expect(await c.send(`cycle/item/${current!.id}`)).toMatchObject({
    days: [],
    historyAvailable: false,
  });
});

it("lists and filters readable cycle tasks without descriptions or hidden project labels", async () => {
  const c = await setup();
  await c.enable();
  const [current] = await c.cycles();
  await c.send("task/bulk", "PATCH", {
    taskIds: [c.alphaTask.id, c.betaTask.id],
    operation: "updateCycle",
    value: current!.id,
  });
  await db.insert(schema.labelTable).values([
    {
      taskId: c.alphaTask.id,
      workspaceId: c.workspace.id,
      name: "Launch",
      color: "#123456",
    },
    {
      taskId: c.betaTask.id,
      workspaceId: c.workspace.id,
      name: "Secret",
      color: "#123456",
    },
  ]);
  await db
    .update(schema.taskTable)
    .set({
      description: "Large private description",
      title: "Fix 100% coverage",
      priority: "high",
    })
    .where(eq(schema.taskTable.id, c.alphaTask.id));
  mockAuthenticatedSession(c.restricted);
  const base = `cycle/item/${current!.id}/tasks`;
  const list = await c.send(base);
  expect(list.items.map((task: { id: string }) => task.id)).toEqual([
    c.alphaTask.id,
  ]);
  expect(list.items[0]).toMatchObject({
    priority: "high",
    category: "unstarted",
    labels: [{ name: "Launch", color: "#123456" }],
  });
  expect(list.items[0]).not.toHaveProperty("description");
  expect((await c.send(`${base}?label=Secret`)).items).toEqual([]);
  expect((await c.send(`${base}?priority=low`)).items).toEqual([]);
  expect((await c.send(`${base}?projectId=${c.beta.id}`)).items).toEqual([]);
  expect(
    (
      await c.send(
        `${base}?search=100%25&label=Launch&priority=high&assigneeId=${c.restricted.id}&category=unstarted`,
      )
    ).items,
  ).toHaveLength(1);
});

it("disabling cycles closes the current cycle, deletes upcoming cycles and clears their assignments", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
  const c = await setup();
  await c.enable();
  const [current, upcoming] = await c.cycles();
  await c.send(`task/${c.alphaTask.id}/cycle`, "PUT", { cycleId: current!.id });
  await c.send(`task/${c.betaTask.id}/cycle`, "PUT", { cycleId: upcoming!.id });
  expect(
    await c.send(`cycle/settings/${c.workspace.id}`, "PUT", {
      cyclesEnabled: false,
    }),
  ).toMatchObject({ cyclesEnabled: false });
  expect(await c.cycles()).toEqual([
    expect.objectContaining({ id: current!.id, completedAt: expect.any(Date) }),
  ]);
  expect(await c.send(`task/${c.alphaTask.id}/cycle-properties`)).toMatchObject(
    { cycle: { id: current!.id } },
  );
  expect(await c.send(`task/${c.betaTask.id}/cycle-properties`)).toMatchObject({
    cycle: null,
  });
  expect(
    await db
      .select()
      .from(schema.activityTable)
      .where(
        and(
          eq(schema.activityTable.taskId, c.betaTask.id),
          eq(schema.activityTable.type, "cycle_changed"),
        ),
      ),
  ).toHaveLength(2);
  await updateCycleSettings(
    c.who,
    { cyclesEnabled: true },
    new Date("2027-03-03T12:00:00Z"),
  );
  expect(await c.cycles()).toHaveLength(4);
  expect((await c.cycles())[1]?.startsAt).toEqual(
    new Date("2027-03-01T00:00:00Z"),
  );
});

it("enforces feature, workspace, viewer and settings permissions for every cycle route", async () => {
  const c = await setup();
  await c.enable();
  const [current] = await c.cycles();
  const paths = [
    `cycle/${c.workspace.id}`,
    `cycle/settings/${c.workspace.id}`,
    `cycle/item/${current!.id}`,
    `cycle/item/${current!.id}/tasks`,
  ];
  mockAnonymousSession();
  for (const path of paths)
    expect((await c.request(`/parity/${path}`)).status).toBe(401);
  const outsider = await createWorkspaceMember();
  mockAuthenticatedSession(outsider.user);
  for (const path of paths)
    expect((await c.request(`/parity/${path}`)).status).toBe(404);
  const viewer = await addWorkspaceMember(c.workspace.id, "viewer");
  mockAuthenticatedSession(viewer);
  for (const path of paths)
    expect((await c.request(`/parity/${path}`)).status).toBe(200);
  expect(
    (
      await c.request(`/parity/cycle/item/${current!.id}`, {
        method: "PUT",
        body: { name: "Denied" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await c.request(`/parity/cycle/settings/${c.workspace.id}`, {
        method: "PUT",
        body: { cyclesEnabled: false },
      })
    ).status,
  ).toBe(403);
  vi.stubEnv("PARITY_FEATURES", "foundation");
  for (const path of paths)
    expect((await c.request(`/parity/${path}`)).status).toBe(404);
});

it("uses the existing job lease and leaves disabled/archived workspaces alone", async () => {
  const c = await setup();
  await c.enable();
  await db.insert(schema.jobLeaseTable).values({
    name: "cycle-tick",
    owner: "another-worker",
    expiresAt: new Date(Date.now() + 60_000),
  });
  expect(await cycleTick(new Date("2026-11-16T00:00:00Z"))).toMatchObject({
    processed: 0,
  });
  await db
    .delete(schema.jobLeaseTable)
    .where(eq(schema.jobLeaseTable.name, "cycle-tick"));
  expect(await cycleTick(new Date("2026-11-16T00:00:00Z"))).toMatchObject({
    processed: 1,
    degraded: false,
  });
  await db
    .update(schema.workspaceTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.workspaceTable.id, c.workspace.id));
  expect(await cycleTick()).toMatchObject({ processed: 0 });
});

it("clears stale foreign cycle references while keeping estimates and milestones intact", async () => {
  const c = await setup();
  const other = await createWorkspaceMember();
  const [foreign] = await db
    .insert(cycleTable)
    .values({
      workspaceId: other.workspace.id,
      number: 1,
      startsAt: new Date("2026-11-09Z"),
      endsAt: new Date("2026-11-16Z"),
    })
    .returning();
  const [milestone] = await db
    .insert(projectMilestoneTable)
    .values({ projectId: c.alpha.id, name: "Launch" })
    .returning();
  await db.insert(taskExtTable).values({
    taskId: c.alphaTask.id,
    cycleId: foreign!.id,
    estimate: 3,
    milestoneId: milestone!.id,
  });
  const result = await reconcileCycleReferences(c.alpha.id);
  expect(result?.formerWorkspaceIds).toEqual([other.workspace.id]);
  expect(
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, c.alphaTask.id))
    )[0],
  ).toMatchObject({ cycleId: null, estimate: 3, milestoneId: milestone!.id });
});

it("assigns a cycle atomically while accepting triage, and rejects an invalid cycle without consuming the report", async () => {
  const c = await setup();
  vi.stubEnv("PARITY_FEATURES", "cycles,triage");
  await c.enable();
  const [cycle] = await c.cycles();
  await db.insert(taskExtTable).values({
    taskId: c.alphaTask.id,
    triageState: "pending",
    triageSource: "member",
  });
  const path = `/parity/triage/item/${c.alphaTask.id}/accept`;
  expect(
    (
      await c.request(path, {
        method: "POST",
        body: { columnId: c.alphaTask.columnId, cycleId: "missing" },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await db
        .select()
        .from(taskExtTable)
        .where(eq(taskExtTable.taskId, c.alphaTask.id))
    )[0]?.triageState,
  ).toBe("pending");
  expect(
    (
      await c.request(path, {
        method: "POST",
        body: { columnId: c.alphaTask.columnId, cycleId: cycle!.id },
      })
    ).status,
  ).toBe(200);
  expect(await c.send(`task/${c.alphaTask.id}/cycle-properties`)).toMatchObject(
    { cycle: { id: cycle!.id } },
  );
});
