import { eq } from "drizzle-orm";
import { beforeEach, afterEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createTriageItem } from "../../apps/api/src/parity/triage/controllers/create";
import { updateTriageSettings } from "../../apps/api/src/parity/triage/controllers/settings";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { projectAccessApi } from "./helpers/project-access/project-access-api";
beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "views,triage,cycles");
});
afterEach(() => vi.unstubAllEnvs());
it("persists a member template estimate atomically and preserves it on acceptance", async () => {
  const c = await createWorkspaceMember({ role: "owner" });
  const { project, columns } = await createProjectFixture({
    workspaceId: c.workspace.id,
  });
  await updateTriageSettings(project.id, c.workspace.id, { enabled: true });
  await db
    .insert(schema.workspaceExtTable)
    .values({ workspaceId: c.workspace.id, estimateScale: "fibonacci" });
  mockAuthenticatedSession(c.user);
  const api = projectAccessApi();
  const path = `/parity/triage/project/${project.id}`;
  const response = await api(path, {
    method: "POST",
    body: { title: "Template estimate", estimate: 3 },
  });
  expect(response.status).toBe(200);
  const task = await response.json();
  expect(
    await db.query.taskExtTable.findFirst({
      where: eq(schema.taskExtTable.taskId, task.id),
    }),
  ).toMatchObject({ estimate: 3, triageState: "pending" });
  expect(
    (
      await api(`/parity/triage/item/${task.id}/accept`, {
        method: "POST",
        body: { columnId: columns.todo.id },
      })
    ).status,
  ).toBe(200);
  expect(
    await db.query.taskExtTable.findFirst({
      where: eq(schema.taskExtTable.taskId, task.id),
    }),
  ).toMatchObject({ estimate: 3, triageState: "accepted" });
  expect(
    (
      await api(path, {
        method: "POST",
        body: { title: "Invalid scale", estimate: 4 },
      })
    ).status,
  ).toBe(400);
  expect(await db.select().from(schema.taskTable)).toHaveLength(1);
  vi.stubEnv("PARITY_FEATURES", "views,triage");
  expect(
    (
      await api(path, {
        method: "POST",
        body: { title: "Disabled estimates", estimate: 3 },
      })
    ).status,
  ).toBe(404);
  expect(await db.select().from(schema.taskTable)).toHaveLength(1);
});
it("does not accept estimate defaults from public intake", async () => {
  const c = await createWorkspaceMember({ role: "owner" });
  const { project } = await createProjectFixture({
    workspaceId: c.workspace.id,
  });
  const settings = await updateTriageSettings(project.id, c.workspace.id, {
    enabled: true,
    rotateIntakeToken: true,
  });
  const task = await createTriageItem(
    project.id,
    { title: "Intake", description: "", estimate: 8 },
    { email: "reporter@example.com", token: settings.intakeToken! },
  );
  expect(
    await db.query.taskExtTable.findFirst({
      where: eq(schema.taskExtTable.taskId, task.id),
    }),
  ).toMatchObject({ estimate: null, triageState: "pending" });
});
