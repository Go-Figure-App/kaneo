import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";
import db, { schema } from "../../apps/api/src/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { eq } from "drizzle-orm";
beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views");
});
afterEach(() => vi.unstubAllEnvs());
it("reclaims deleted targets on add while preserving favorites for revoked targets", async () => {
  const c = await createRestrictedWorkspace();
  mockAuthenticatedSession(c.restricted);
  const api = projectAccessApi();
  const path = `/parity/favorites/${c.workspace.id}`;
  await db.insert(schema.favoriteTable).values([
    {
      userId: c.restricted.id,
      kind: "project",
      targetId: c.beta.id,
      position: 0,
    },
    ...Array.from({ length: 999 }, (_, index) => ({
      userId: c.restricted.id,
      kind: (["project", "task", "cycle", "initiative", "view"] as const)[
        index % 5
      ]!,
      targetId: `deleted-${index}`,
      position: index + 1,
    })),
  ]);
  expect((await (await api(path)).json()).items).toEqual([]);
  // Reads must not mutate, including when a target is unavailable.
  expect(await db.select().from(schema.favoriteTable)).toHaveLength(1000);
  expect(
    (
      await api(path, {
        method: "POST",
        body: { kind: "task", targetId: c.alphaTask.id },
      })
    ).status,
  ).toBe(200);
  const remaining = await db
    .select()
    .from(schema.favoriteTable)
    .where(eq(schema.favoriteTable.userId, c.restricted.id));
  expect(remaining.map((row) => row.targetId).sort()).toEqual(
    [c.beta.id, c.alphaTask.id].sort(),
  );
});
it("does not delete another workspace's favorite through a workspace-scoped route", async () => {
  const c = await createRestrictedWorkspace();
  const other = await createWorkspaceMember();
  await db.insert(schema.workspaceUserTable).values({
    workspaceId: other.workspace.id,
    userId: c.owner.id,
    role: "owner",
    joinedAt: new Date(),
  });
  mockAuthenticatedSession(c.owner);
  const api = projectAccessApi();
  expect(
    (
      await api(`/parity/favorites/${c.workspace.id}`, {
        method: "POST",
        body: { kind: "project", targetId: c.alpha.id },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await api(
        `/parity/favorites/${other.workspace.id}/project/${c.alpha.id}`,
        { method: "DELETE" },
      )
    ).status,
  ).toBe(404);
  expect(
    (await (await api(`/parity/favorites/${c.workspace.id}`)).json()).items,
  ).toHaveLength(1);
});
it("keeps favorites personal, filters inaccessible targets and persists their order", async () => {
  const c = await createRestrictedWorkspace();
  const api = projectAccessApi();
  mockAuthenticatedSession(c.owner);
  const path = `/parity/favorites/${c.workspace.id}`;
  const targets = [
    { kind: "project", targetId: c.alpha.id },
    { kind: "task", targetId: c.alphaTask.id },
  ];
  for (const target of targets)
    expect((await api(path, { method: "POST", body: target })).status).toBe(
      200,
    );
  expect((await api(path, { method: "POST", body: targets[0] })).status).toBe(
    200,
  );
  expect((await (await api(path)).json()).items).toHaveLength(2);
  const reordered = await api(`${path}/order`, {
    method: "PUT",
    body: { items: [...targets].reverse() },
  });
  expect(reordered.status).toBe(200);
  expect(
    (await reordered.json()).items.map(
      (item: { targetId: string }) => item.targetId,
    ),
  ).toEqual([c.alphaTask.id, c.alpha.id]);
  expect(
    (
      await api(`${path}/order`, {
        method: "PUT",
        body: { items: [targets[0], targets[0]] },
      })
    ).status,
  ).toBe(400);
  mockAuthenticatedSession(c.restricted);
  expect((await (await api(path)).json()).items).toEqual([]);
  expect(
    (
      await api(path, {
        method: "POST",
        body: { kind: "project", targetId: c.beta.id },
      })
    ).status,
  ).toBe(404);
  expect((await api(path, { method: "POST", body: targets[0] })).status).toBe(
    200,
  );
  expect((await api(path, { method: "POST", body: targets[1] })).status).toBe(
    200,
  );
  await restrictToProjects(c.workspace.id, c.restricted.id, [c.beta.id]);
  expect((await (await api(path)).json()).items).toEqual([]);
  await restrictToProjects(c.workspace.id, c.restricted.id, [c.alpha.id]);
  expect(
    (await api(`${path}/project/${c.alpha.id}`, { method: "DELETE" })).status,
  ).toBe(200);
  expect(
    (await (await api(path)).json()).items.map(
      (item: { kind: string }) => item.kind,
    ),
  ).toEqual(["task"]);
});
it("removes view bookmarks when their owner deletes the view", async () => {
  const c = await createRestrictedWorkspace();
  const api = projectAccessApi();
  mockAuthenticatedSession(c.owner);
  const view = await (
    await api(`/parity/views/${c.workspace.id}`, {
      method: "POST",
      body: { name: "Shared", shared: true },
    })
  ).json();
  const path = `/parity/favorites/${c.workspace.id}`;
  mockAuthenticatedSession(c.restricted);
  expect(
    (
      await api(path, {
        method: "POST",
        body: { kind: "view", targetId: view.id },
      })
    ).status,
  ).toBe(200);
  mockAuthenticatedSession(c.owner);
  expect(
    (
      await api(`/parity/views/${c.workspace.id}/${view.id}`, {
        method: "DELETE",
      })
    ).status,
  ).toBe(200);
  mockAuthenticatedSession(c.restricted);
  expect((await (await api(path)).json()).items).toEqual([]);
});
