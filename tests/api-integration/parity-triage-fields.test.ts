import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import { createTriageItem } from "../../apps/api/src/parity/triage/controllers/create";
import { createNextOccurrence } from "../../apps/api/src/task/recurrence/create-next-occurrence";
import { updateTriageSettings } from "../../apps/api/src/parity/triage/controllers/settings";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

vi.mock("../../apps/api/src/storage/s3", async (original) => ({
  ...(await original<object>()),
  getPrivateObject: async () => ({
    body: new Uint8Array([1]),
    contentType: "image/png",
    contentLength: 1,
  }),
}));
beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "triage");
});
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const { user, workspace } = await createWorkspaceMember({ role: "owner" });
  const { project, columns } = await createProjectFixture({
    workspaceId: workspace.id,
  });
  const settings = await updateTriageSettings(project.id, workspace.id, {
    enabled: true,
  });
  mockAuthenticatedSession(user);
  return {
    user,
    workspace,
    project,
    columns,
    settings,
    request: projectAccessApi(),
  };
}

it("preserves member fields and staged uploads while keeping pending public-project assets private", async () => {
  const ctx = await setup();
  await db
    .update(schema.projectTable)
    .set({ isPublic: true })
    .where(eq(schema.projectTable.id, ctx.project.id));
  const [field] = await db
    .insert(schema.customFieldDefinitionTable)
    .values({ projectId: ctx.project.id, name: "Size", type: "number" })
    .returning();
  const [asset] = await db
    .insert(schema.assetTable)
    .values({
      projectId: ctx.project.id,
      workspaceId: ctx.workspace.id,
      createdBy: ctx.user.id,
      surface: "draft",
      objectKey: randomUUID(),
      filename: "report.png",
      mimeType: "image/png",
      size: 1,
    })
    .returning();
  const response = await ctx.request(`/parity/triage/${ctx.project.id}`, {
    method: "POST",
    body: {
      title: "Full report",
      description: `![Report](/api/asset/${asset.id})`,
      priority: "high",
      userId: ctx.user.id,
      startDate: "2030-01-01",
      dueDate: "2030-01-03",
      draftAssetIds: [asset.id],
      customFields: [{ fieldId: field.id, value: "3" }],
    },
  });
  expect(response.status).toBe(200);
  const task = (await response.json()) as { id: string };
  expect(
    await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    }),
  ).toMatchObject({
    priority: "high",
    userId: ctx.user.id,
    startDate: new Date("2030-01-01"),
    dueDate: new Date("2030-01-03"),
  });
  expect(await db.query.customFieldValueTable.findMany()).toContainEqual(
    expect.objectContaining({ taskId: task.id, fieldId: field.id, value: "3" }),
  );
  expect(await db.query.assetTable.findFirst()).toMatchObject({
    taskId: task.id,
    surface: "description",
  });
  mockAnonymousSession();
  expect((await ctx.request(`/asset/${asset.id}`)).status).toBe(401);
  mockAuthenticatedSession(ctx.user);
  const memberAsset = await ctx.request(`/asset/${asset.id}`);
  expect(memberAsset.status).toBe(200);
  expect(memberAsset.headers.get("cache-control")).toMatch(/^private,/);
  expect(
    (
      await ctx.request(`/parity/triage/item/${task.id}/accept`, {
        method: "POST",
        body: { columnId: ctx.columns.todo.id },
      })
    ).status,
  ).toBe(200);
  mockAnonymousSession();
  expect((await ctx.request(`/asset/${asset.id}`)).status).toBe(200);
});

it("rejects another member's staged asset and rolls back the entire submission", async () => {
  const ctx = await setup();
  const other = await createWorkspaceMember();
  const [asset] = await db
    .insert(schema.assetTable)
    .values({
      projectId: ctx.project.id,
      workspaceId: ctx.workspace.id,
      createdBy: other.user.id,
      surface: "draft",
      objectKey: randomUUID(),
      filename: "report.png",
      mimeType: "image/png",
      size: 1,
    })
    .returning();
  expect(
    (
      await ctx.request(`/parity/triage/${ctx.project.id}`, {
        method: "POST",
        body: {
          title: "Bad upload",
          description: `![Report](/api/asset/${asset.id})`,
          draftAssetIds: [asset.id],
        },
      })
    ).status,
  ).toBe(400);
  expect(await db.query.taskTable.findMany()).toHaveLength(0);
  expect(await db.query.taskExtTable.findMany()).toHaveLength(0);
  expect(await db.query.assetTable.findFirst()).toMatchObject({
    taskId: null,
    surface: "draft",
  });
});

it("materializes required defaults on public intake acceptance and rejects invalid defaults", async () => {
  const ctx = await setup();
  const [field] = await db
    .insert(schema.customFieldDefinitionTable)
    .values({
      projectId: ctx.project.id,
      name: "Size",
      type: "number",
      required: true,
      defaultValue: "invalid",
    })
    .returning();
  const task = await createTriageItem(
    ctx.project.id,
    { title: "Public report", description: "" },
    { email: "reporter@example.com", token: ctx.settings.intakeToken! },
  );
  const accept = () =>
    ctx.request(`/parity/triage/item/${task.id}/accept`, {
      method: "POST",
      body: { columnId: ctx.columns.todo.id },
    });
  expect((await accept()).status).toBe(400);
  expect(await db.query.customFieldValueTable.findMany()).toHaveLength(0);
  await db
    .update(schema.customFieldDefinitionTable)
    .set({ defaultValue: "5" })
    .where(eq(schema.customFieldDefinitionTable.id, field.id));
  expect((await accept()).status).toBe(200);
  expect(await db.query.customFieldValueTable.findMany()).toContainEqual(
    expect.objectContaining({ taskId: task.id, fieldId: field.id, value: "5" }),
  );
});

it("enforces API-key read, create, update and assignment scopes independently", async () => {
  const ctx = await setup();
  const task = await createTriageItem(
    ctx.project.id,
    { title: "Scoped", description: "" },
    { userId: ctx.user.id, workspaceId: ctx.workspace.id },
  );
  const { key } = await auth.api.createApiKey({
    body: {
      userId: ctx.user.id,
      name: "Triage limited",
      permissions: {
        workspace: ["read"],
        project: ["read"],
        task: ["read", "create", "update"],
      },
    },
  });
  mockAnonymousSession();
  const request = projectAccessApi({ "x-api-key": key });
  expect((await request(`/parity/triage/${ctx.workspace.id}`)).status).toBe(
    200,
  );
  expect(
    (await request(`/parity/triage/settings/${ctx.project.id}`)).status,
  ).toBe(403);
  expect(
    (
      await request(`/parity/triage/${ctx.project.id}`, {
        method: "POST",
        body: { title: "Assigned", userId: ctx.user.id },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(`/parity/triage/item/${task.id}/accept`, {
        method: "POST",
        body: { columnId: ctx.columns.todo.id, assigneeId: null },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(`/parity/triage/item/${task.id}/accept`, {
        method: "POST",
        body: { columnId: ctx.columns.todo.id },
      })
    ).status,
  ).toBe(200);
  const readKey = await auth.api.createApiKey({
    body: {
      userId: ctx.user.id,
      name: "Read triage",
      permissions: { workspace: ["read"], project: ["read"], task: ["read"] },
    },
  });
  expect(
    (
      await projectAccessApi({ "x-api-key": readKey.key })(
        `/parity/triage/${ctx.project.id}`,
        { method: "POST", body: { title: "Denied" } },
      )
    ).status,
  ).toBe(403);
});

it("denies every decision on a hidden project without changing the task", async () => {
  const ctx = await createRestrictedWorkspace();
  await updateTriageSettings(ctx.beta.id, ctx.workspace.id, { enabled: true });
  const task = await createTriageItem(
    ctx.beta.id,
    { title: "Hidden", description: "" },
    { userId: ctx.owner.id, workspaceId: ctx.workspace.id },
  );
  mockAuthenticatedSession(ctx.restricted);
  const request = projectAccessApi();
  for (const [action, body] of [
    ["accept", { columnId: "missing" }],
    ["decline", { comment: "No" }],
    ["duplicate", { duplicateOfTaskId: ctx.alphaTask.id }],
    ["snooze", { until: new Date(Date.now() + 60_000).toISOString() }],
  ] as const)
    expect(
      (
        await request(`/parity/triage/item/${task.id}/${action}`, {
          method: "POST",
          body,
        })
      ).status,
    ).toBe(403);
  expect(
    await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, task.id),
    }),
  ).toMatchObject({ status: "triage", columnId: null });
});

it("does not start a recurring series before acceptance or after declining it", async () => {
  const ctx = await setup();
  const recurrence = {
    frequency: "weekly",
    interval: 1,
    timeZone: "UTC",
  } as const;
  const task = await createTriageItem(
    ctx.project.id,
    { title: "Repeating intake", description: "", recurrence },
    { userId: ctx.user.id, workspaceId: ctx.workspace.id },
  );
  await db
    .update(schema.taskTable)
    .set({ status: ctx.columns.done.slug, columnId: ctx.columns.done.id })
    .where(eq(schema.taskTable.id, task.id));
  expect(await createNextOccurrence(task.id, ctx.user.id)).toBeNull();
  expect(
    (
      await ctx.request(`/parity/triage/item/${task.id}/decline`, {
        method: "POST",
        body: { comment: "This recurring request is out of scope" },
      })
    ).status,
  ).toBe(200);
  expect(await createNextOccurrence(task.id, ctx.user.id)).toBeNull();
  expect(await db.query.taskTable.findMany()).toHaveLength(1);
  expect(await db.query.taskTable.findFirst()).toMatchObject({
    recurrence: null,
  });
  expect(await db.query.activityTable.findMany()).toContainEqual(
    expect.objectContaining({
      type: "triage_declined",
      eventData: { stoppedRecurrence: recurrence },
    }),
  );
});
