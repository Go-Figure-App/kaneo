import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { savedViewSchema } from "../../apps/api/src/parity/views/schema";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
import db, { schema } from "../../apps/api/src/database";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views");
});
afterEach(() => vi.unstubAllEnvs());
it("hides shared filters from their owner after an administrator adds an inaccessible reference", async () => {
  const c = await createRestrictedWorkspace();
  await db.insert(schema.workspaceRoleTable).values({
    workspaceId: c.workspace.id,
    role: "member",
    permission: JSON.stringify({
      workspace: ["read"],
      project: ["read", "update"],
      task: ["read"],
    }),
  });
  const api = projectAccessApi();
  const path = `/parity/views/${c.workspace.id}`;
  mockAuthenticatedSession(c.restricted);
  const created = await api(path, {
    method: "POST",
    body: { name: "Member view", shared: true },
  });
  expect(created.status).toBe(200);
  const view = await created.json();
  mockAuthenticatedSession(c.owner);
  expect(
    (
      await api(`${path}/${view.id}`, {
        method: "PUT",
        body: {
          name: "Member view",
          shared: true,
          filters: [{ field: "project", operator: "is", values: [c.beta.id] }],
        },
      })
    ).status,
  ).toBe(200);
  mockAuthenticatedSession(c.restricted);
  expect((await api(`${path}/${view.id}`)).status).toBe(404);
  expect((await (await api(path)).json()).items).toEqual([]);
  expect(
    (
      await api(`/parity/favorites/${c.workspace.id}`, {
        method: "POST",
        body: { kind: "view", targetId: view.id },
      })
    ).status,
  ).toBe(404);
});
it("keeps shared filter references private without weakening their predicates", async () => {
  const c = await createRestrictedWorkspace();
  const api = projectAccessApi();
  mockAuthenticatedSession(c.owner);
  const [milestone] = await db
    .insert(schema.projectMilestoneTable)
    .values({ projectId: c.beta.id, name: "Private milestone" })
    .returning();
  const path = `/parity/views/${c.workspace.id}`;
  const ids: string[] = [];
  for (const [field, value] of [
    ["project", c.beta.id],
    ["milestone", milestone!.id],
  ]) {
    const created = await api(path, {
      method: "POST",
      body: {
        name: `Shared ${field}`,
        shared: true,
        filters: [{ field, operator: "is-not", values: [value] }],
      },
    });
    expect(created.status).toBe(200);
    ids.push((await created.json()).id);
  }
  mockAuthenticatedSession(c.restricted);
  expect((await (await api(path)).json()).items).toEqual([]);
  for (const id of ids) {
    expect((await api(`${path}/${id}`)).status).toBe(404);
    expect(
      (
        await api(`/parity/favorites/${c.workspace.id}`, {
          method: "POST",
          body: { kind: "view", targetId: id },
        })
      ).status,
    ).toBe(404);
  }
  expect(
    (
      await api(path, {
        method: "POST",
        body: {
          name: "Hidden reference",
          filters: [{ field: "project", operator: "is", values: [c.beta.id] }],
        },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await api(path, {
        method: "POST",
        body: {
          name: "Visible reference",
          filters: [
            { field: "project", operator: "is", values: [c.alpha.id, null] },
          ],
        },
      })
    ).status,
  ).toBe(200);
});
it("keeps personal and project-scoped views private and round-trips display and filters", async () => {
  const c = await createRestrictedWorkspace();
  const api = projectAccessApi();
  mockAuthenticatedSession(c.owner);
  const path = `/parity/views/${c.workspace.id}`;
  const create = async (body: object) => {
    const r = await api(path, { method: "POST", body });
    expect(r.status, await r.clone().text()).toBe(200);
    return savedViewSchema.parse(await r.json());
  };
  const personal = await create({ name: "Only mine" });
  const shared = await create({
    name: "Urgent work",
    shared: true,
    filters: [{ field: "priority", operator: "is", values: ["urgent"] }],
    display: {
      layout: "board",
      groupBy: "assignee",
      orderBy: "due",
      direction: "desc",
      properties: ["estimate"],
    },
  });
  const hidden = await create({
    name: "Secret project view",
    shared: true,
    projectId: c.beta.id,
  });
  mockAuthenticatedSession(c.restricted);
  const list = await (await api(path)).json();
  expect(list.items.map((view: { id: string }) => view.id)).toEqual([
    shared.id,
  ]);
  expect(list.items[0]).toMatchObject({
    filters: shared.filters,
    display: shared.display,
    canEdit: false,
  });
  for (const id of [personal.id, hidden.id])
    expect((await api(`${path}/${id}`)).status).toBe(404);
  expect(
    (
      await api(`${path}/${shared.id}`, {
        method: "PUT",
        body: { name: "Hijacked", shared: true },
      })
    ).status,
  ).toBe(403);
  expect((await api(`${path}/${shared.id}`, { method: "DELETE" })).status).toBe(
    403,
  );
  expect(
    (
      await api(path, {
        method: "POST",
        body: { name: "Hidden", projectId: c.beta.id },
      })
    ).status,
  ).toBe(404);
  mockAuthenticatedSession(c.owner);
  const update = await api(`${path}/${shared.id}`, {
    method: "PUT",
    body: {
      ...shared,
      id: undefined,
      workspaceId: undefined,
      ownerId: undefined,
      canEdit: undefined,
      name: "Renamed",
      shared: false,
    },
  });
  expect(update.status).toBe(200);
  mockAuthenticatedSession(c.restricted);
  expect((await api(`${path}/${shared.id}`)).status).toBe(404);
  mockAuthenticatedSession(c.owner);
  expect((await api(`${path}/${shared.id}`, { method: "DELETE" })).status).toBe(
    200,
  );
  expect((await api(`${path}/${shared.id}`)).status).toBe(404);
});
it("allows personal views for a member without taking ownership from the request", async () => {
  const c = await createRestrictedWorkspace();
  mockAuthenticatedSession(c.restricted);
  const api = projectAccessApi();
  const path = `/parity/views/${c.workspace.id}`;
  const r = await api(path, { method: "POST", body: { name: "My queue" } });
  expect(r.status).toBe(200);
  const view = await r.json();
  expect(view.ownerId).toBe(c.restricted.id);
  expect(view.canEdit).toBe(true);
  expect(
    (
      await api(path, {
        method: "POST",
        body: { name: "Forged", ownerId: c.owner.id },
      })
    ).status,
  ).toBe(400);
  expect((await api(`${path}/${view.id}`, { method: "DELETE" })).status).toBe(
    200,
  );
  vi.stubEnv("PARITY_FEATURES", "");
  expect((await api(path)).status).toBe(404);
});
