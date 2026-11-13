import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { workspaceExtTable } from "../../apps/api/src/database/schema-parity";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views");
});
afterEach(() => vi.unstubAllEnvs());
it("creates, renames and deletes project templates with validated defaults", async () => {
  const c = await createRestrictedWorkspace();
  const api = projectAccessApi();
  mockAuthenticatedSession(c.owner);
  await db
    .insert(workspaceExtTable)
    .values({ workspaceId: c.workspace.id, estimateScale: "fibonacci" });
  await db
    .insert(schema.labelTable)
    .values({ workspaceId: c.workspace.id, name: "Bug", color: "#000000" });
  const body = {
    name: "Bug report",
    title: "Bug: ",
    description: "## Steps\n\n## Expected",
    defaults: {
      priority: "high",
      labels: ["Bug"],
      assigneeId: c.restricted.id,
      estimate: 3,
    },
  };
  const path = `/parity/templates/${c.alpha.id}`;
  const create = await api(path, { method: "POST", body });
  expect(create.status, await create.clone().text()).toBe(200);
  expect(await create.json()).toMatchObject(body);
  const list = await (await api(path)).json();
  expect(list.items).toHaveLength(1);
  expect((await api(`${path}/${encodeURIComponent(body.name)}`)).status).toBe(
    200,
  );
  expect((await api(path, { method: "POST", body })).status).toBe(409);
  expect(
    (
      await api(path, {
        method: "POST",
        body: {
          ...body,
          name: "Other",
          defaults: { ...body.defaults, estimate: 4 },
        },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await api(path, {
        method: "POST",
        body: {
          ...body,
          name: "Other",
          defaults: { ...body.defaults, labels: ["Missing label"] },
        },
      })
    ).status,
  ).toBe(400);
  const renamed = {
    ...body,
    name: "Regression",
    defaults: {
      ...body.defaults,
      assigneeId: null,
      estimate: null,
      labels: [],
    },
  };
  expect(
    (
      await api(`${path}/${encodeURIComponent(body.name)}`, {
        method: "PUT",
        body: renamed,
      })
    ).status,
  ).toBe(200);
  expect((await api(`${path}/${encodeURIComponent(body.name)}`)).status).toBe(
    404,
  );
  expect((await (await api(`${path}/Regression`)).json()).defaults).toEqual(
    renamed.defaults,
  );
  expect((await api(`${path}/Regression`, { method: "DELETE" })).status).toBe(
    200,
  );
  expect((await (await api(path)).json()).items).toEqual([]);
});
it("denies hidden-project templates and invalid assignees without creating a row", async () => {
  const c = await createRestrictedWorkspace();
  const api = projectAccessApi();
  mockAuthenticatedSession(c.owner);
  const body = {
    name: "Secret template",
    title: "Confidential",
    description: "",
    defaults: {},
  };
  expect(
    (await api(`/parity/templates/${c.beta.id}`, { method: "POST", body }))
      .status,
  ).toBe(200);
  mockAuthenticatedSession(c.restricted);
  for (const suffix of ["", "/Secret%20template"])
    expect([403, 404]).toContain(
      (await api(`/parity/templates/${c.beta.id}${suffix}`)).status,
    );
  mockAuthenticatedSession(c.owner);
  expect(
    (
      await api(`/parity/templates/${c.alpha.id}`, {
        method: "POST",
        body: { ...body, defaults: { assigneeId: "not-a-member" } },
      })
    ).status,
  ).toBe(403);
  expect(
    (await (await api(`/parity/templates/${c.alpha.id}`)).json()).items,
  ).toEqual([]);
  vi.stubEnv("PARITY_FEATURES", "");
  expect((await api(`/parity/templates/${c.alpha.id}`)).status).toBe(404);
});
