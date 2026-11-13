import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views");
});
afterEach(() => vi.unstubAllEnvs());
it("rejects anonymous and read-only API-key mutations on every Views resource", async () => {
  const c = await createRestrictedWorkspace();
  const views = `/parity/views/${c.workspace.id}`;
  const favorites = `/parity/favorites/${c.workspace.id}`;
  const templates = `/parity/templates/${c.alpha.id}`;
  const reads = [
    `/parity/tasks/${c.workspace.id}`,
    `/parity/tasks/${c.workspace.id}/options`,
    views,
    `${views}/missing`,
    favorites,
    templates,
    `${templates}/missing`,
  ];
  const writes: [string, string, object?][] = [
    [views, "POST", { name: "Personal" }],
    [`${views}/missing`, "PUT", { name: "Change" }],
    [`${views}/missing`, "DELETE"],
    [favorites, "POST", { kind: "task", targetId: c.alphaTask.id }],
    [`${favorites}/order`, "PUT", { items: [] }],
    [`${favorites}/task/${c.alphaTask.id}`, "DELETE"],
    [
      templates,
      "POST",
      { name: "New", title: "Title", description: "", defaults: {} },
    ],
    [
      `${templates}/missing`,
      "PUT",
      { name: "Change", title: "Title", description: "", defaults: {} },
    ],
    [`${templates}/missing`, "DELETE"],
  ];
  mockAnonymousSession();
  for (const path of reads)
    expect((await projectAccessApi()(path)).status, path).toBe(401);
  for (const [path, method, body] of writes)
    expect(
      (await projectAccessApi()(path, { method, body })).status,
      path,
    ).toBe(401);
  const key = `views-read-${c.restricted.id}`.padEnd(64, "x");
  await db.insert(schema.apikeyTable).values({
    referenceId: c.restricted.id,
    userId: c.restricted.id,
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
  const request = projectAccessApi({ "x-api-key": key });
  const tasks = await request(reads[0]!);
  expect(tasks.status).toBe(200);
  expect(
    (await tasks.json()).items.map((task: { id: string }) => task.id),
  ).toEqual([c.alphaTask.id]);
  for (const path of [reads[1]!, views, favorites, templates])
    expect((await request(path)).status).toBe(200);
  for (const [path, method, body] of writes)
    expect((await request(path, { method, body })).status, path).toBe(403);
  vi.stubEnv("PARITY_FEATURES", "");
  for (const path of reads)
    expect((await request(path)).status, path).toBe(404);
});
it("lets viewers organize personal views and favorites while shared configuration requires project update", async () => {
  const c = await createRestrictedWorkspace();
  const viewer = await addWorkspaceMember(c.workspace.id, "viewer");
  mockAuthenticatedSession(viewer);
  const api = projectAccessApi();
  const path = `/parity/views/${c.workspace.id}`;
  expect(
    (await api(path, { method: "POST", body: { name: "Personal" } })).status,
  ).toBe(200);
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
      await api(path, {
        method: "POST",
        body: { name: "Shared", shared: true },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await api(`/parity/templates/${c.alpha.id}`, {
        method: "POST",
        body: { name: "New", title: "Title", description: "", defaults: {} },
      })
    ).status,
  ).toBe(403);
});
