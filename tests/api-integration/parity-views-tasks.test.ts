import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { workspaceTaskSchema } from "../../apps/api/src/parity/views/schema";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { insightsFixture } from "./helpers/parity-insights";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views");
});
afterEach(() => vi.unstubAllEnvs());
it("offers only readable projects and milestones in filter choices", async () => {
  const c = await insightsFixture();
  await db.insert(schema.projectMilestoneTable).values([
    { projectId: c.alpha.id, name: "Visible milestone" },
    { projectId: c.beta.id, name: "Private milestone" },
  ]);
  mockAuthenticatedSession(c.restricted);
  const api = projectAccessApi();
  const response = await api(`/parity/tasks/${c.workspace.id}/options`);
  expect(response.status).toBe(200);
  const options = await response.json();
  expect(options.projects.map((project: { id: string }) => project.id)).toEqual(
    [c.alpha.id],
  );
  expect(
    options.milestones.map((milestone: { name: string }) => milestone.name),
  ).toEqual(["Visible milestone"]);
  expect(options.timeZone).toBe("America/New_York");
  expect(
    (
      await (
        await api(
          `/parity/tasks/${c.workspace.id}/options?projectId=${c.beta.id}`,
        )
      ).json()
    ).milestones,
  ).toEqual([]);
  mockAnonymousSession();
  expect((await api(`/parity/tasks/${c.workspace.id}/options`)).status).toBe(
    401,
  );
});

it("pages and orders readable accepted issues without hidden projects or label multiplication", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  const api = projectAccessApi();
  const first = await api(
    `/parity/tasks/${c.workspace.id}?pageSize=2&orderBy=created`,
  );
  expect(first.status).toBe(200);
  const page = await first.json();
  expect(page.items).toHaveLength(2);
  expect(page.hasMore).toBe(true);
  const second = await (
    await api(
      `/parity/tasks/${c.workspace.id}?pageSize=2&page=2&orderBy=created`,
    )
  ).json();
  expect(second.items).toHaveLength(1);
  expect(second.hasMore).toBe(false);
  const items = [...page.items, ...second.items].map((item) =>
    workspaceTaskSchema.parse({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      completedAt: item.completedAt ? new Date(item.completedAt) : null,
    }),
  );
  expect(new Set(items.map((item) => item.id)).size).toBe(3);
  expect(items.map((item) => item.id)).not.toContain(c.betaTask.id);
  expect(items.map((item) => item.id)).not.toContain(c.pending.id);
  expect(items.find((item) => item.id === c.alphaTask.id)?.labels).toHaveLength(
    2,
  );
  expect(page.timeZone).toBe("America/New_York");
  const search = await (
    await api(`/parity/tasks/${c.workspace.id}?search=alpha-2`)
  ).json();
  expect(search.items.map((item: { id: string }) => item.id)).toEqual([
    c.second.id,
  ]);
});

it("applies typed equality, exclusions, nulls and workspace-calendar date filters", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  await db
    .insert(schema.activityTable)
    .values({ taskId: c.alphaTask.id, type: "created", userId: c.owner.id });
  await db.execute(
    sql`update ${schema.taskTable} set due_date = '2026-11-02 04:30:00'::timestamp where id = ${c.open.id}`,
  );
  const cases: [object, string[]][] = [
    [
      { field: "category", operator: "is", values: ["completed"] },
      [c.alphaTask.id, c.second.id],
    ],
    [{ field: "estimate", operator: "is", value: 3 }, [c.alphaTask.id]],
    [
      { field: "estimate", operator: "is-not", value: 3 },
      [c.second.id, c.open.id],
    ],
    [{ field: "estimate", operator: "after", value: 3 }, [c.second.id]],
    [{ field: "assignee", operator: "is", values: [null] }, [c.open.id]],
    [
      { field: "creator", operator: "is", values: [c.owner.id] },
      [c.alphaTask.id],
    ],
    [
      { field: "creator", operator: "is", values: [null] },
      [c.second.id, c.open.id],
    ],
    [
      { field: "cycle", operator: "is", values: [c.cycle.id] },
      [c.alphaTask.id, c.second.id],
    ],
    [{ field: "cycle", operator: "is-not", values: [c.cycle.id] }, [c.open.id]],
    [
      { field: "label", operator: "is", values: ["Release"] },
      [c.alphaTask.id, c.second.id],
    ],
    [
      { field: "label", operator: "is-not", values: ["Bug"] },
      [c.second.id, c.open.id],
    ],
    [{ field: "label", operator: "is", values: [null] }, [c.open.id]],
    [{ field: "project", operator: "is", values: [c.beta.id] }, []],
    [
      { field: "completed", operator: "is", value: "2026-11-10" },
      [c.alphaTask.id],
    ],
    [{ field: "completed", operator: "is", value: null }, [c.open.id]],
    [{ field: "due", operator: "is", value: "2026-11-01" }, [c.open.id]],
    [{ field: "due", operator: "after", value: "2026-11-01" }, []],
  ];
  const api = projectAccessApi();
  for (const [filter, expected] of cases) {
    const response = await api(
      `/parity/tasks/${c.workspace.id}?${new URLSearchParams({ filters: JSON.stringify([filter]) })}`,
    );
    expect(response.status, JSON.stringify(filter)).toBe(200);
    const body = await response.json();
    expect(
      body.items.map((item: { id: string }) => item.id).sort(),
      JSON.stringify(filter),
    ).toEqual(expected.sort());
  }
  const invalid = await api(`/parity/tasks/${c.workspace.id}?filters=not-json`);
  expect(invalid.status).toBe(400);
  const unknown = await api(`/parity/tasks/${c.workspace.id}?unsupported=true`);
  expect(unknown.status).toBe(400);
});

it("keeps task filters behind authentication, workspace access and the views flag", async () => {
  const c = await insightsFixture();
  const api = projectAccessApi();
  mockAnonymousSession();
  expect((await api(`/parity/tasks/${c.workspace.id}`)).status).toBe(401);
  mockAuthenticatedSession(c.restricted);
  expect((await api("/parity/tasks/missing-workspace")).status).toBe(404);
  vi.stubEnv("PARITY_FEATURES", "");
  expect((await api(`/parity/tasks/${c.workspace.id}`)).status).toBe(404);
  await db
    .update(schema.projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.projectTable.id, c.alpha.id));
  vi.stubEnv("PARITY_FEATURES", "views");
  expect(
    (await (await api(`/parity/tasks/${c.workspace.id}`)).json()).items,
  ).toEqual([]);
});
