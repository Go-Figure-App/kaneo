import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { insightsFixture } from "./helpers/parity-insights";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views,initiatives,cycles");
});
afterEach(() => vi.unstubAllEnvs());

async function matching(workspaceId: string, filter: object) {
  const response = await projectAccessApi()(
    `/parity/tasks/${workspaceId}?${new URLSearchParams({ filters: JSON.stringify([filter]) })}`,
  );
  expect(response.status).toBe(200);
  return (await response.json()).items
    .map((item: { id: string }) => item.id)
    .sort();
}

it("distinguishes workflow names sharing a category and keeps private states out of choices", async () => {
  const c = await insightsFixture();
  const [design, privateState] = await db
    .insert(schema.columnTable)
    .values([
      {
        projectId: c.alpha.id,
        name: "Needs design",
        slug: "needs-design",
        position: 20,
      },
      {
        projectId: c.beta.id,
        name: "Private review",
        slug: "private-review",
        position: 20,
      },
    ])
    .returning();
  expect(privateState).toBeDefined();
  await db
    .update(schema.taskTable)
    .set({ columnId: design!.id, status: design!.slug })
    .where(eq(schema.taskTable.id, c.open.id));
  mockAuthenticatedSession(c.restricted);
  expect(
    await matching(c.workspace.id, {
      field: "state",
      operator: "is",
      values: ["Needs design"],
    }),
  ).toEqual([c.open.id]);
  expect(
    await matching(c.workspace.id, {
      field: "state",
      operator: "is-not",
      values: ["Needs design"],
    }),
  ).toEqual([c.alphaTask.id, c.second.id].sort());
  const options = await (
    await projectAccessApi()(`/parity/tasks/${c.workspace.id}/options`)
  ).json();
  expect(options.states.map((s: { name: string }) => s.name)).toContain(
    "Needs design",
  );
  expect(options.states.map((s: { name: string }) => s.name)).not.toContain(
    "Private review",
  );
});

it("filters archived issues by their recorded workflow without changing archive state", async () => {
  const c = await insightsFixture();
  const [design] = await db
    .insert(schema.columnTable)
    .values({
      projectId: c.alpha.id,
      name: "Needs design",
      slug: "needs-design",
      position: 20,
    })
    .returning();
  await db
    .update(schema.taskTable)
    .set({ columnId: null, status: "archived" })
    .where(eq(schema.taskTable.id, c.open.id));
  await db.insert(schema.activityTable).values([
    {
      taskId: c.open.id,
      type: "status_changed",
      eventData: { newStatus: "done" },
      createdAt: new Date("2026-11-10T12:00:00Z"),
    },
    {
      taskId: c.open.id,
      type: "status_changed",
      eventData: { newStatus: design!.slug },
      createdAt: new Date("2026-11-11T12:00:00Z"),
    },
    {
      taskId: c.open.id,
      type: "status_changed",
      eventData: { oldStatus: design!.slug, newStatus: "archived" },
      createdAt: new Date("2026-11-12T12:00:00Z"),
    },
  ]);
  mockAuthenticatedSession(c.restricted);
  const filter = { field: "state", operator: "is", values: ["Needs design"] };
  expect(await matching(c.workspace.id, filter)).toEqual([c.open.id]);
  expect(
    await matching(c.workspace.id, { ...filter, operator: "is-not" }),
  ).toEqual([c.alphaTask.id, c.second.id].sort());
  // A task may be archived directly after creation, without earlier changes.
  await db.execute(sql`delete from ${schema.activityTable}
    where task_id = ${c.open.id} and event_data->>'newStatus' <> 'archived'`);
  expect(await matching(c.workspace.id, filter)).toEqual([c.open.id]);
  // A matching slug in another project must not resolve a deleted state.
  await db.insert(schema.columnTable).values({
    projectId: c.beta.id,
    name: "Needs design",
    slug: design!.slug,
    position: 20,
  });
  await db
    .delete(schema.columnTable)
    .where(eq(schema.columnTable.id, design!.id));
  expect(await matching(c.workspace.id, filter)).toEqual([]);
  expect(
    await matching(c.workspace.id, { ...filter, values: ["archived"] }),
  ).toEqual([c.open.id]);
});

it("follows initiative membership changes without duplicating tasks or exposing other workspaces", async () => {
  const c = await insightsFixture();
  const other = await createWorkspaceMember();
  const [first, second, foreign] = await db
    .insert(schema.initiativeTable)
    .values([
      { workspaceId: c.workspace.id, name: "First" },
      { workspaceId: c.workspace.id, name: "Second" },
      { workspaceId: other.workspace.id, name: "Foreign" },
    ])
    .returning();
  await db.insert(schema.initiativeProjectTable).values([
    { initiativeId: first!.id, projectId: c.alpha.id },
    { initiativeId: second!.id, projectId: c.alpha.id },
    { initiativeId: first!.id, projectId: c.beta.id },
  ]);
  mockAuthenticatedSession(c.restricted);
  const filter = {
    field: "initiative",
    operator: "is",
    values: [first!.id, second!.id],
  };
  const expected = [c.alphaTask.id, c.second.id, c.open.id].sort();
  expect(await matching(c.workspace.id, filter)).toEqual(expected);
  expect(
    await matching(c.workspace.id, {
      field: "initiative",
      operator: "is",
      values: [null],
    }),
  ).toEqual([]);
  await db
    .delete(schema.initiativeProjectTable)
    .where(eq(schema.initiativeProjectTable.projectId, c.alpha.id));
  expect(await matching(c.workspace.id, filter)).toEqual([]);
  expect(
    await matching(c.workspace.id, {
      field: "initiative",
      operator: "is",
      values: [null],
    }),
  ).toEqual(expected);
  const api = projectAccessApi();
  const options = await (
    await api(`/parity/tasks/${c.workspace.id}/options`)
  ).json();
  expect(options.initiatives.map((i: { id: string }) => i.id).sort()).toEqual(
    [first!.id, second!.id].sort(),
  );
  const rejected = await api(`/parity/views/${c.workspace.id}`, {
    method: "POST",
    body: {
      name: "Invalid reference",
      filters: [
        { field: "initiative", operator: "is-not", values: [foreign!.id] },
      ],
    },
  });
  expect(rejected.status).toBe(400);
});

it("evaluates current cycle at request time, retaining unassigned issues in the exclusion", async () => {
  const c = await insightsFixture();
  mockAuthenticatedSession(c.restricted);
  const filter = { field: "cycle-period", operator: "is", values: ["current"] };
  await db.execute(
    sql`update ${schema.cycleTable} set starts_at = now() - interval '1 hour', ends_at = now() + interval '1 hour' where id = ${c.cycle.id}`,
  );
  expect(await matching(c.workspace.id, filter)).toEqual(
    [c.alphaTask.id, c.second.id].sort(),
  );
  expect(
    await matching(c.workspace.id, { ...filter, operator: "is-not" }),
  ).toEqual([c.open.id]);
  await db.execute(
    sql`update ${schema.cycleTable} set starts_at = now() - interval '2 hours', ends_at = now() where id = ${c.cycle.id}`,
  );
  expect(await matching(c.workspace.id, filter)).toEqual([]);
  await db.execute(
    sql`update ${schema.cycleTable} set starts_at = now() + interval '1 hour', ends_at = now() + interval '2 hours' where id = ${c.cycle.id}`,
  );
  expect(await matching(c.workspace.id, filter)).toEqual([]);
});

it("includes archived projects only when requested and still enforces project restrictions", async () => {
  const c = await insightsFixture();
  await db
    .update(schema.projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.projectTable.id, c.alpha.id));
  await db
    .update(schema.projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.projectTable.id, c.beta.id));
  mockAuthenticatedSession(c.restricted);
  const api = projectAccessApi();
  const hidden = await (await api(`/parity/tasks/${c.workspace.id}`)).json();
  expect(hidden.items).toEqual([]);
  const included = await (
    await api(`/parity/tasks/${c.workspace.id}?includeArchivedProjects=true`)
  ).json();
  expect(included.items.map((t: { id: string }) => t.id).sort()).toEqual(
    [c.alphaTask.id, c.second.id, c.open.id].sort(),
  );
  const disabled = await (
    await api(`/parity/tasks/${c.workspace.id}?includeArchivedProjects=false`)
  ).json();
  expect(disabled.items).toEqual([]);
  const invalid = await api(
    `/parity/tasks/${c.workspace.id}?includeArchivedProjects=yes`,
  );
  expect(invalid.status).toBe(400);
});
