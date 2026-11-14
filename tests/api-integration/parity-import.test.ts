import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  activeImportSlots,
  waitForActiveImports,
} from "../../apps/api/src/import/active-imports";
import * as planningFinish from "../../apps/api/src/parity/import/finish";
import * as projectPlacement from "../../apps/api/src/project/controllers/insert-project";
import * as importSettings from "../../apps/api/src/parity/import/write-settings";
import { lockCycleWorkspace } from "../../apps/api/src/parity/cycles/access";
import { connectPlanningLinear } from "../../apps/api/src/parity/import/connect";
import {
  fixtureFetch,
  linearFixture,
} from "../../apps/api/src/parity/import/__fixtures__/linear";
import { syncLifecycle } from "../../apps/api/src/parity/foundation/controllers/sync-lifecycle";
import { getCycle } from "../../apps/api/src/parity/cycles/read";
import { closeCycle } from "../../apps/api/src/parity/cycles/close";
import { progressCounts } from "../../apps/api/src/parity/planning/progress-query";
import { importId } from "../../apps/api/src/parity/import/values";
import { mockAuthenticatedSession, mockAnonymousSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

const network = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../../apps/api/src/import/guarded-fetch", () => ({
  createGuardedFetch: () => ({
    fetch: network.fetch,
    failure: () => null,
    lastHost: () => "api.linear.app",
    reset: () => {},
  }),
}));
const connection = {
  source: "linear",
  apiKey: "linear-test-secret-never-persist",
};
beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv(
    "PARITY_FEATURES",
    "import,triage,projects,initiatives,cycles,views,insights",
  );
  network.fetch.mockReset();
});
afterEach(async () => {
  await waitForActiveImports();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function expectNoImportedRows() {
  for (const table of [
    schema.projectTable,
    schema.workspaceMemberProjectTable,
    schema.columnTable,
    schema.taskTable,
    schema.activityTable,
    schema.labelTable,
    schema.taskRelationTable,
    schema.externalLinkTable,
    schema.workspaceExtTable,
    schema.projectExtTable,
    schema.columnExtTable,
    schema.taskExtTable,
    schema.projectMilestoneTable,
    schema.cycleTable,
    schema.initiativeTable,
    schema.initiativeProjectTable,
    schema.statusUpdateTable,
  ])
    expect(await db.select().from(table)).toEqual([]);
}

it("keeps committed projects but reports a failed final linking stage", async () => {
  const c = await setup();
  vi.spyOn(planningFinish, "finishPlanningImport").mockRejectedValueOnce(
    new Error("Synthetic link failure"),
  );
  const result = await run(c);
  expect(result.status).toBe("failed");
  expect(result.error).toContain("unexpected error");
  expect(
    result.projects.every((p: { status: string }) => p.status === "completed"),
  ).toBe(true);
  expect(await db.select().from(schema.taskTable)).toHaveLength(3);
  expect(await db.select().from(schema.taskRelationTable)).toEqual([]);
});

it("stops after a canceled read without writing the project", async () => {
  const c = await setup();
  const fetch = fixtureFetch(c.fixture);
  network.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (String(init?.body).includes("query PlanningProjectUpdates"))
      for (const slot of activeImportSlots())
        slot.controller.abort(new Error("Synthetic stop"));
    return response;
  });
  const result = await run(c, ["project:project-a"]);
  expect(result.status).toBe("failed");
  expect(await db.select().from(schema.projectTable)).toEqual([]);
});

it("rolls back an in-flight planning write when canceled before commit", async () => {
  const c = await setup();
  const planning = await connectPlanningLinear({
    apiKey: "synthetic",
    fetch: fixtureFetch(c.fixture),
  });
  await planning.source.listProjects();
  const project = await planning.source.readProject("project:project-a", {
    includeComments: false,
  });
  const controller = new AbortController();
  const writing = planning.writeProject({
    workspaceId: c.workspace.id,
    userId: c.user.id,
    source: "linear",
    project,
    includeComments: false,
    runId: "canceled-run",
    sourceProjectId: "project:project-a",
    selectedProjectIds: ["project:project-a"],
    signal: controller.signal,
  });
  controller.abort(new Error("Synthetic stop"));
  await expect(writing).rejects.toThrow("Synthetic stop");
  await expectNoImportedRows();
});

it("rolls back all rows when cancellation arrives during project placement", async () => {
  const c = await setup();
  const planning = await connectPlanningLinear({
    apiKey: "synthetic",
    fetch: fixtureFetch(c.fixture),
  });
  await planning.source.listProjects();
  const project = await planning.source.readProject("project:project-a", {
    includeComments: true,
  });
  const controller = new AbortController();
  const place = projectPlacement.placeProject;
  const placement = vi
    .spyOn(projectPlacement, "placeProject")
    .mockImplementation(async (...args) => {
      await place(...args);
      controller.abort(new Error("Stopped during placement"));
    });
  await expect(
    planning.writeProject({
      workspaceId: c.workspace.id,
      userId: c.user.id,
      source: "linear",
      project,
      includeComments: true,
      runId: "placement-canceled-run",
      sourceProjectId: "project:project-a",
      selectedProjectIds: ["project:project-a"],
      signal: controller.signal,
    }),
  ).rejects.toThrow("Stopped during placement");
  expect(placement).toHaveBeenCalledOnce();
  await expectNoImportedRows();
});

it("waits for the cycle allocator before writing settings and assigning cycle numbers", async () => {
  const c = await setup();
  const settings = vi.spyOn(importSettings, "writeImportSettings");
  const locked = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const allocation = db.transaction(async (tx) => {
    await lockCycleWorkspace(tx, c.workspace.id);
    locked.resolve();
    await release.promise;
    await tx.insert(schema.cycleTable).values({
      workspaceId: c.workspace.id,
      number: 1,
      startsAt: new Date("2023-01-01Z"),
      endsAt: new Date("2023-01-15Z"),
    });
  });
  await locked.promise;
  const importing = run(c, ["project:project-a"]);
  try {
    await vi.waitFor(async () => {
      const waiting = await db.execute(sql`
        SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = 1524
          AND objid = (hashtext(${c.workspace.id})::bigint & 4294967295)::oid
          AND NOT granted
      `);
      expect(waiting.rows).toHaveLength(1);
    });
    expect(settings).not.toHaveBeenCalled();
  } finally {
    release.resolve();
    await allocation;
    await importing;
  }
  expect((await importing).projects[0].status).toBe("completed");
  expect(
    (
      await db
        .select()
        .from(schema.cycleTable)
        .orderBy(schema.cycleTable.number)
    ).map((cycle) => cycle.number),
  ).toEqual([1, 2]);
});

async function setup() {
  const context = await createWorkspaceMember({
    role: "owner",
    userName: "Importer",
  });
  const fixture = linearFixture(context.user.email);
  network.fetch.mockImplementation(fixtureFetch(fixture));
  mockAuthenticatedSession(context.user);
  return { ...context, fixture, api: projectAccessApi() };
}
async function run(
  context: Awaited<ReturnType<typeof setup>>,
  projectIds = ["project:project-a", "project:project-b", "team:team-a"],
) {
  const response = await context.api("/import/runs", {
    method: "POST",
    body: {
      workspaceId: context.workspace.id,
      connection,
      projectIds,
      includeComments: true,
    },
  });
  expect(response.status, await response.clone().text()).toBe(202);
  const { run } = await response.json();
  await waitForActiveImports();
  const result = await context.api(
    `/import/runs/${context.workspace.id}/${run.id}`,
  );
  expect(result.status).toBe(200);
  return (await result.json()).run;
}
it("imports project plans, milestones, updates, shared initiatives, cycles, triage, identifiers and cross-project duplicates", async () => {
  const c = await setup();
  c.fixture.initiativeProjects[0]!.sortOrder = "2";
  c.fixture.initiativeProjects[1]!.sortOrder = "10";
  const listed = await c.api("/import/projects", {
    method: "POST",
    body: { workspaceId: c.workspace.id, connection },
  });
  expect(listed.status).toBe(200);
  expect(JSON.stringify(await listed.json())).toContain("team:team-a");
  const result = await run(c);
  expect(result.status).toBe("completed");
  expect(
    result.projects.map((project: { status: string }) => project.status),
  ).toEqual(["completed", "completed", "completed"]);
  const projects = await db.select().from(schema.projectTable);
  expect(projects.map((project) => project.name).sort()).toEqual([
    "Engineering — No project",
    "Launch",
    "Platform",
  ]);
  const launch = projects.find((project) => project.name === "Launch")!;
  const [plan] = await db
    .select()
    .from(schema.projectExtTable)
    .where(eq(schema.projectExtTable.projectId, launch.id));
  expect(plan).toMatchObject({
    status: "started",
    health: "at_risk",
    priority: "high",
    leadId: c.user.id,
    startDate: "2024-01-01",
    targetDate: "2024-02-01",
  });
  expect(await db.select().from(schema.initiativeTable)).toHaveLength(2);
  expect(await db.select().from(schema.initiativeProjectTable)).toHaveLength(2);
  const initiativeProjects = await db
    .select()
    .from(schema.initiativeProjectTable);
  expect(
    initiativeProjects.find((link) => link.projectId === launch.id)?.position,
  ).toBe(0);
  expect(
    initiativeProjects.find((link) => link.projectId !== launch.id)?.position,
  ).toBe(1);
  expect(await db.select().from(schema.statusUpdateTable)).toHaveLength(2);
  const [milestone] = await db.select().from(schema.projectMilestoneTable);
  const tasks = await db.select().from(schema.taskTable);
  const completed = tasks.find((task) => task.title === "Issue 42")!;
  const duplicate = tasks.find((task) => task.title === "Issue 43")!;
  const triage = tasks.find((task) => task.title === "Issue 44")!;
  const ext = await db.select().from(schema.taskExtTable);
  expect(ext.find((row) => row.taskId === completed.id)).toMatchObject({
    estimate: 3,
    milestoneId: milestone!.id,
    completedAt: new Date("2024-01-05T00:00:00.000Z"),
  });
  expect(ext.find((row) => row.taskId === duplicate.id)).toMatchObject({
    triageState: "duplicate",
    duplicateOfTaskId: completed.id,
  });
  expect(ext.find((row) => row.taskId === triage.id)?.triageState).toBe(
    "pending",
  );
  expect(await db.select().from(schema.cycleTable)).toHaveLength(1);
  const [settings] = await db.select().from(schema.workspaceExtTable);
  expect(settings).toMatchObject({
    timeZone: "America/Los_Angeles",
    estimateScale: "fibonacci",
    cyclesEnabled: false,
  });
  const cycle = await getCycle(importId(result.id, "cycle", "cycle-a"), {
    userId: c.user.id,
    workspaceId: c.workspace.id,
  });
  expect(cycle.historyAvailable).toBe(false);
  expect(cycle.summary).toBeNull();
  expect(cycle.days).toEqual([]);
  expect(await db.select().from(schema.externalLinkTable)).toHaveLength(3);
  expect(await db.select().from(schema.taskRelationTable)).toHaveLength(1);
  expect(
    JSON.stringify(await db.select().from(schema.importRunTable)),
  ).not.toContain(connection.apiKey);
  expect(completed.updatedAt.toISOString()).toBe("2024-01-10T00:00:00.000Z");
  await syncLifecycle(completed.id);
  const [reconciled] = await db
    .select()
    .from(schema.taskExtTable)
    .where(eq(schema.taskExtTable.taskId, completed.id));
  expect(reconciled?.completedAt?.toISOString()).toBe(
    "2024-01-05T00:00:00.000Z",
  );
});
it("preserves archived timestamps and does not attribute unknown creators to the importer", async () => {
  const c = await setup();
  const issue = c.fixture.issues.get("project-a")![0]!;
  issue.archivedAt = "2024-02-01T00:00:00.000Z";
  issue.creator = { name: "Former teammate", email: "former@example.com" };
  await run(c, ["project:project-a"]);
  const [task] = await db.select().from(schema.taskTable);
  expect(task?.status).toBe("archived");
  const [created] = await db
    .select()
    .from(schema.activityTable)
    .where(
      and(
        eq(schema.activityTable.taskId, task!.id),
        eq(schema.activityTable.type, "created"),
      ),
    );
  expect(created?.userId).toBeNull();
  await syncLifecycle(task!.id);
  const [ext] = await db.select().from(schema.taskExtTable);
  expect(ext?.completedAt?.toISOString()).toBe("2024-01-05T00:00:00.000Z");
  expect(
    (await progressCounts([task!.projectId])).projects.get(task!.projectId),
  ).toMatchObject({ total: 1, completed: 1 });
  const cycle = await getCycle(ext!.cycleId!, {
    workspaceId: c.workspace.id,
    userId: c.user.id,
  });
  expect(cycle.progress.completedCount).toBe(1);
  const throughput = await c.api(
    `/parity/insights/${c.workspace.id}?measure=throughput&from=2024-01-01&to=2024-02-01`,
  );
  expect(throughput.status).toBe(200);
  expect(
    (await throughput.json()).rows.reduce(
      (total: number, row: { value: number }) => total + row.value,
      0,
    ),
  ).toBe(1);
});

it("keeps archived unfinished work out of workload and cycle rollover", async () => {
  const c = await setup();
  const issue = c.fixture.issues.get("project-a")![0]!;
  issue.archivedAt = "2024-01-10T00:00:00.000Z";
  issue.state = c.fixture.states.find((state) => state.type === "unstarted")!;
  issue.completedAt = null;
  issue.startedAt = null;
  issue.stateHistory.nodes = [];
  const result = await run(c, ["project:project-a"]);
  expect(result.projects[0].status).toBe("completed");
  const workload = await c.api(
    `/parity/insights/${c.workspace.id}?measure=workload`,
  );
  expect(workload.status).toBe(200);
  expect((await workload.json()).rows).toEqual([]);
  const [cycle] = await db
    .update(schema.cycleTable)
    .set({ completedAt: null })
    .returning();
  const [next] = await db
    .insert(schema.cycleTable)
    .values({
      workspaceId: c.workspace.id,
      number: 2,
      startsAt: new Date("2024-02-01Z"),
      endsAt: new Date("2024-02-15Z"),
    })
    .returning();
  const rolled = await db.transaction((tx) =>
    closeCycle(tx, cycle!, next!, "fibonacci", new Date("2024-02-01Z")),
  );
  expect(rolled).toEqual([]);
  const [ext] = await db.select().from(schema.taskExtTable);
  expect(ext!.cycleId).toBe(cycle!.id);
});
it("rolls back a project's tasks and planning data together on invalid source data", async () => {
  const c = await setup();
  c.fixture.issues.get("project-a")![0]!.url = "javascript:alert(1)";
  const result = await run(c, ["project:project-a"]);
  expect(result.projects[0].status).toBe("failed");
  await expectNoImportedRows();
});
it("preserves configured workspace settings and allocates colliding cycle numbers", async () => {
  const c = await setup();
  await db.insert(schema.workspaceExtTable).values({
    workspaceId: c.workspace.id,
    estimateScale: "linear",
    timeZone: "UTC",
    cyclesEnabled: false,
  });
  await db.insert(schema.cycleTable).values({
    workspaceId: c.workspace.id,
    number: 1,
    startsAt: new Date("2023-01-01Z"),
    endsAt: new Date("2023-01-15Z"),
  });
  const result = await run(c, ["project:project-a"]);
  expect(result.projects[0].warnings.join(" ")).toContain(
    "imported it as cycle 2",
  );
  const [settings] = await db.select().from(schema.workspaceExtTable);
  expect(settings).toMatchObject({ estimateScale: "linear", timeZone: "UTC" });
  expect(
    (await db.select().from(schema.cycleTable)).map((row) => row.number).sort(),
  ).toEqual([1, 2]);
});
it("rejects unauthorized discovery and import before reading Linear", async () => {
  const c = await setup();
  const member = await addWorkspaceMember(c.workspace.id);
  mockAuthenticatedSession(member);
  for (const path of ["/import/projects", "/import/runs"]) {
    const response = await c.api(path, {
      method: "POST",
      body: {
        workspaceId: c.workspace.id,
        connection,
        projectIds: ["project:project-a"],
      },
    });
    expect(response.status).toBe(403);
  }
  expect(network.fetch).not.toHaveBeenCalled();
});
it("searches original identifiers while excluding hidden projects and pending triage", async () => {
  const c = await setup();
  await run(c);
  const found = await c.api(
    `/search?q=ENG-42&type=tasks&limit=1&workspaceId=${c.workspace.id}`,
  );
  expect(found.status).toBe(200);
  expect(JSON.stringify(await found.json())).toContain("Issue 42");
  const workspaceIssues = await c.api(
    `/parity/tasks/${c.workspace.id}?search=ENG-42`,
  );
  expect(workspaceIssues.status).toBe(200);
  expect(
    (await workspaceIssues.json()).items.map(
      (task: { title: string }) => task.title,
    ),
  ).toEqual(["Issue 42"]);
  const [launch] = await db
    .select()
    .from(schema.projectTable)
    .where(eq(schema.projectTable.name, "Launch"));
  await db.insert(schema.taskTable).values(
    [1, 2].map((number) => ({
      projectId: launch!.id,
      number: 100 + number,
      title: `Reference ENG-42 ${number}`,
      status: "to-do",
    })),
  );
  const ranked = await c.api(
    `/search?q=ENG-42&type=tasks&limit=1&workspaceId=${c.workspace.id}`,
  );
  expect(ranked.status).toBe(200);
  expect(JSON.stringify(await ranked.json())).toContain("Issue 42");
  const pending = await c.api(
    `/search?q=ENG-44&type=tasks&workspaceId=${c.workspace.id}`,
  );
  expect(JSON.stringify(await pending.json())).not.toContain("Issue 44");
  const member = await addWorkspaceMember(c.workspace.id);
  const [otherProject] = await db
    .select()
    .from(schema.projectTable)
    .where(eq(schema.projectTable.name, "Platform"));
  await restrictToProjects(c.workspace.id, member.id, [otherProject!.id]);
  mockAuthenticatedSession(member);
  const hidden = await c.api(
    `/search?q=ENG-42&type=tasks&workspaceId=${c.workspace.id}`,
  );
  expect(hidden.status).toBe(200);
  expect(JSON.stringify(await hidden.json())).not.toContain("Issue 42");
  const hiddenIssues = await c.api(
    `/parity/tasks/${c.workspace.id}?search=ENG-42`,
  );
  expect((await hiddenIssues.json()).items).toEqual([]);
});

it("rejects read-only API keys even when their owner can import", async () => {
  const c = await setup();
  const key = "linear-import-read-key".padEnd(64, "x");
  await db.insert(schema.apikeyTable).values({
    referenceId: c.user.id,
    userId: c.user.id,
    key: createHash("sha256").update(key).digest("base64url"),
    createdAt: new Date(),
    updatedAt: new Date(),
    enabled: true,
    rateLimitEnabled: false,
    permissions: JSON.stringify({
      workspace: ["read"],
      project: ["read"],
      task: ["read"],
    }),
  });
  mockAnonymousSession();
  const api = projectAccessApi({ "x-api-key": key });
  for (const path of ["/import/projects", "/import/runs"])
    expect(
      (
        await api(path, {
          method: "POST",
          body: {
            workspaceId: c.workspace.id,
            connection,
            projectIds: ["project:project-a"],
          },
        })
      ).status,
    ).toBe(403);
  expect(network.fetch).not.toHaveBeenCalled();
});

it("keeps the upstream team importer when the feature is disabled", async () => {
  const c = await setup();
  vi.stubEnv("PARITY_FEATURES", "");
  network.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    const { query } = JSON.parse(String(init?.body));
    const pageInfo = { hasNextPage: false, endCursor: null };
    if (query.includes("ImportViewer"))
      return Response.json({ data: { viewer: { id: "viewer" } } });
    if (query.includes("ImportTeams"))
      return Response.json({
        data: { teams: { nodes: c.fixture.teams, pageInfo } },
      });
    if (query.includes("ImportTeam"))
      return Response.json({
        data: {
          team: { ...c.fixture.teams[0], states: { nodes: c.fixture.states } },
        },
      });
    if (query.includes("ImportIssues"))
      return Response.json({
        data: {
          issues: {
            nodes: [...c.fixture.issues.values()].flat().map((issue) => ({
              ...issue,
              relations: { nodes: [], pageInfo },
            })),
            pageInfo,
          },
        },
      });
    if (query.includes("ImportComments"))
      return Response.json({ data: { comments: { nodes: [], pageInfo } } });
    throw new Error("The planning adapter ran while disabled");
  });
  const result = await run(c, ["team-a"]);
  expect(result.projects[0].status).toBe("completed");
  const projects = await db.select().from(schema.projectTable);
  expect(projects).toHaveLength(1);
  expect(projects[0]?.name).toBe("Engineering");
  expect(await db.select().from(schema.taskTable)).toHaveLength(3);
  expect(await db.select().from(schema.taskExtTable)).toEqual([]);
  expect(await db.select().from(schema.initiativeTable)).toEqual([]);
});

it("retains successful projects and reports links to a failed project without dangling references", async () => {
  const c = await setup();
  c.fixture.issues.get("project-a")![0]!.url = "invalid";
  const result = await run(c, ["project:project-a", "project:project-b"]);
  expect(
    result.projects.map((project: { status: string }) => project.status),
  ).toEqual(["failed", "completed"]);
  expect(result.projects[1].warnings.join(" ")).toContain(
    "outside the successfully imported projects",
  );
  expect(await db.select().from(schema.taskRelationTable)).toEqual([]);
  const [extension] = await db.select().from(schema.taskExtTable);
  expect(extension?.duplicateOfTaskId).toBeNull();
  expect(await db.select().from(schema.initiativeProjectTable)).toHaveLength(1);
});
