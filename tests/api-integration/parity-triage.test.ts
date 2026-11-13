import { and, eq } from "drizzle-orm";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import db, { getDatabasePool, schema } from "../../apps/api/src/database";
import {
  columnExtTable,
  projectExtTable,
  taskExtTable,
} from "../../apps/api/src/database/schema-parity";
import { createTriageItem } from "../../apps/api/src/parity/triage/controllers/create";
import { updateTriageSettings } from "../../apps/api/src/parity/triage/controllers/settings";
import { stageIntegrationTriage } from "../../apps/api/src/parity/triage/integration-intake";
import { wakeSnoozedTriage } from "../../apps/api/src/parity/triage/snooze-tick";
import getTasks from "../../apps/api/src/task/controllers/get-tasks";
import { claimTaskNumber } from "../../apps/api/src/task/controllers/claim-task-numbers";
import getTask from "../../apps/api/src/task/controllers/get-task";
import { getDescriptionPage } from "../../apps/api/src/task/description-pages";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { drainBackgroundWork } from "./helpers/background-work";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "triage");
});
afterEach(() => vi.unstubAllEnvs());

async function fixture() {
  const { user, workspace } = await createWorkspaceMember({ role: "owner" });
  const { project, columns } = await createProjectFixture({
    workspaceId: workspace.id,
  });
  const settings = await updateTriageSettings(project.id, workspace.id, {
    enabled: true,
    ownerId: user.id,
  });
  mockAuthenticatedSession(user);
  const request = projectAccessApi();
  const submit = async (title = "Investigate report") => {
    const response = await request(`/parity/triage/project/${project.id}`, {
      method: "POST",
      body: { title, description: "Reporter details" },
    });
    expect(response.status).toBe(200);
    return ((await response.json()) as { id: string }).id;
  };
  return { user, workspace, project, columns, settings, request, submit };
}

describe("triage inbox", () => {
  it("creates a pending item, notifies its owner, and excludes it from board pages even after disabling the flag", async () => {
    const ctx = await fixture();
    const taskId = await ctx.submit();
    const response = await ctx.request(
      `/parity/triage/${ctx.workspace.id}?pageSize=1`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 1,
      items: [{ id: taskId, source: "member" }],
    });
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)
      ).json(),
    ).toEqual({ count: 1 });
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/projects`)
      ).json(),
    ).toEqual([
      { id: ctx.project.id, name: ctx.project.name, slug: ctx.project.slug },
    ]);
    expect(await db.query.notificationTable.findMany()).toContainEqual(
      expect.objectContaining({
        userId: ctx.user.id,
        resourceId: taskId,
        type: "triage_created",
      }),
    );
    // Even if another existing task editor changes status, pending is authoritative.
    await db
      .update(schema.taskTable)
      .set({ status: "to-do", columnId: ctx.columns.todo.id })
      .where(eq(schema.taskTable.id, taskId));
    expect((await getTasks(ctx.project.id)).pagination.total).toBe(0);
    await expect(getTask(taskId, true)).rejects.toMatchObject({ status: 404 });
    expect((await getTask(taskId)).id).toBe(taskId);
    await db
      .update(schema.projectTable)
      .set({ isPublic: true })
      .where(eq(schema.projectTable.id, ctx.project.id));
    await expect(
      getDescriptionPage(taskId, {
        offset: 0,
        publicProjectId: ctx.project.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
    vi.stubEnv("PARITY_FEATURES", "");
    expect(
      (await getTasks(ctx.project.id, { publicOnly: true })).pagination.total,
    ).toBe(0);
    expect(
      (await ctx.request(`/parity/triage/${ctx.workspace.id}`)).status,
    ).toBe(404);
  });

  it("excludes pending titles, comments and activities from every search surface until acceptance", async () => {
    const ctx = await fixture();
    const taskId = await ctx.submit("Privateincomingmarker");
    await db.insert(schema.activityTable).values({
      taskId,
      userId: ctx.user.id,
      type: "comment",
      content: "Privateincomingmarker comment",
    });
    const search = async (type: string) => {
      const response = await ctx.request(
        `/search?${new URLSearchParams({ q: "Privateincomingmarker", workspaceId: ctx.workspace.id, type })}`,
      );
      expect(response.status).toBe(200);
      return response.json() as Promise<{ results: unknown[] }>;
    };
    for (const type of ["all", "tasks", "comments", "activities"])
      expect((await search(type)).results).toEqual([]);
    expect(
      (
        await ctx.request(`/parity/triage/item/${taskId}/accept`, {
          method: "POST",
          body: { columnId: ctx.columns.todo.id },
        })
      ).status,
    ).toBe(200);
    expect((await search("all")).results).toContainEqual(
      expect.objectContaining({ id: taskId, type: "task" }),
    );
    expect((await search("comments")).results).toContainEqual(
      expect.objectContaining({
        type: "comment",
        content: "Privateincomingmarker comment",
      }),
    );
  });

  it("creates concurrent billed submissions using only their transaction connections", async () => {
    const ctx = await fixture();
    const { project: second } = await createProjectFixture({
      workspaceId: ctx.workspace.id,
    });
    await updateTriageSettings(second.id, ctx.workspace.id, { enabled: true });
    await drainBackgroundWork();
    vi.stubEnv("KANEO_CLOUD", "true");
    vi.stubEnv("CREEM_API_KEY", "test-key");
    vi.stubEnv("CREEM_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("BILLING_FOUNDING_CUTOFF", "");
    const pool = getDatabasePool();
    const held = await Promise.all(
      Array.from({ length: pool.options.max! - 2 }, () => pool.connect()),
    );
    try {
      const tasks = await Promise.all(
        [ctx.project, second].map((project) =>
          createTriageItem(
            project.id,
            { title: "Billed submission", description: "" },
            { userId: ctx.user.id, workspaceId: ctx.workspace.id },
          ),
        ),
      );
      expect(tasks).toHaveLength(2);
      expect(new Set(tasks.map((task) => task.id)).size).toBe(2);
    } finally {
      for (const client of held) client.release();
    }
    expect(await db.query.workspaceBillingTable.findMany()).toHaveLength(1);
    expect(await db.query.trialGrantTable.findMany()).toHaveLength(1);
    await db
      .update(schema.workspaceBillingTable)
      .set({ trialEndsAt: new Date(0) });
    await expect(
      createTriageItem(
        ctx.project.id,
        { title: "Expired", description: "" },
        { userId: ctx.user.id, workspaceId: ctx.workspace.id },
      ),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("filters hidden projects consistently across lists, count and project selectors", async () => {
    const ctx = await createRestrictedWorkspace();
    for (const project of [ctx.alpha, ctx.beta]) {
      await updateTriageSettings(project.id, ctx.workspace.id, {
        enabled: true,
      });
      await createTriageItem(
        project.id,
        { title: project.name, description: "" },
        { userId: ctx.owner.id, workspaceId: ctx.workspace.id },
      );
    }
    mockAuthenticatedSession(ctx.restricted);
    const request = projectAccessApi();
    const list = await (
      await request(`/parity/triage/${ctx.workspace.id}`)
    ).json();
    expect(list).toMatchObject({
      total: 1,
      items: [{ projectId: ctx.alpha.id }],
    });
    expect(
      await (await request(`/parity/triage/${ctx.workspace.id}/count`)).json(),
    ).toEqual({ count: 1 });
    expect(
      await (
        await request(
          `/parity/triage/${ctx.workspace.id}?projectId=${ctx.beta.id}`,
        )
      ).json(),
    ).toMatchObject({ total: 0, items: [] });
    expect(
      await (
        await request(`/parity/triage/${ctx.workspace.id}/projects`)
      ).json(),
    ).toHaveLength(1);
    expect(
      (
        await request(`/parity/triage/project/${ctx.beta.id}`, {
          method: "POST",
          body: { title: "Hidden" },
        })
      ).status,
    ).toBe(403);
    expect(
      (await request(`/parity/triage/settings/${ctx.beta.id}`)).status,
    ).toBe(403);
    expect(
      (
        await request(`/parity/triage/settings/${ctx.beta.id}`, {
          method: "PUT",
          body: { enabled: false },
        })
      ).status,
    ).toBe(403);
  });

  it("denies anonymous readers, foreign workspaces and viewer mutations", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    mockAnonymousSession();
    expect(
      (await ctx.request(`/parity/triage/${ctx.workspace.id}`)).status,
    ).toBe(401);
    const viewer = await addWorkspaceMember(ctx.workspace.id, "viewer");
    mockAuthenticatedSession(viewer);
    for (const [action, body] of [
      ["accept", { columnId: ctx.columns.todo.id }],
      ["decline", { comment: "No" }],
      ["duplicate", { duplicateOfTaskId: id }],
      ["snooze", { until: new Date(Date.now() + 60_000).toISOString() }],
    ] as const)
      expect(
        (
          await ctx.request(`/parity/triage/item/${id}/${action}`, {
            method: "POST",
            body,
          })
        ).status,
      ).toBe(403);
    expect(
      (
        await ctx.request(`/parity/triage/project/${ctx.project.id}`, {
          method: "POST",
          body: { title: "No" },
        })
      ).status,
    ).toBe(403);
    expect(
      (await ctx.request(`/parity/triage/settings/${ctx.project.id}`)).status,
    ).toBe(403);
    const outsider = await createWorkspaceMember();
    mockAuthenticatedSession(outsider.user);
    expect(
      (await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)).status,
    ).toBe(404);
  });
});

describe("triage decisions", () => {
  it("accepts into a validated column with optional assignment and makes it visible", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    const response = await ctx.request(`/parity/triage/item/${id}/accept`, {
      method: "POST",
      body: {
        columnId: ctx.columns.todo.id,
        assigneeId: ctx.user.id,
        priority: "urgent",
      },
    });
    expect(response.status).toBe(200);
    expect(await getTask(id)).toMatchObject({
      userId: ctx.user.id,
      priority: "urgent",
      columnId: ctx.columns.todo.id,
    });
    expect((await getTasks(ctx.project.id)).pagination.total).toBe(1);
    expect(
      await db.query.taskExtTable.findFirst({
        where: eq(taskExtTable.taskId, id),
      }),
    ).toMatchObject({
      triageState: "accepted",
      triagedBy: ctx.user.id,
      triagedAt: expect.any(Date),
    });
    expect(
      (
        await ctx.request(`/parity/triage/item/${id}/accept`, {
          method: "POST",
          body: { columnId: ctx.columns.todo.id },
        })
      ).status,
    ).toBe(409);
  });

  it("rejects a foreign column, missing assignee, unavailable cycle and missing required fields without consuming the item", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    const other = await createProjectFixture({ workspaceId: ctx.workspace.id });
    for (const body of [
      { columnId: other.columns.todo.id },
      { columnId: ctx.columns.todo.id, assigneeId: "missing" },
      { columnId: ctx.columns.todo.id, cycleId: "missing" },
    ]) {
      const response = await ctx.request(`/parity/triage/item/${id}/accept`, {
        method: "POST",
        body,
      });
      expect([400, 403]).toContain(response.status);
    }
    await db.insert(schema.customFieldDefinitionTable).values({
      projectId: ctx.project.id,
      name: "Required",
      type: "text",
      required: true,
    });
    expect(
      (
        await ctx.request(`/parity/triage/item/${id}/accept`, {
          method: "POST",
          body: { columnId: ctx.columns.todo.id },
        })
      ).status,
    ).toBe(400);
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)
      ).json(),
    ).toEqual({ count: 1 });
  });

  it("requires a decline comment and writes the decision and canceled column atomically", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    expect(
      (
        await ctx.request(`/parity/triage/item/${id}/decline`, {
          method: "POST",
          body: { comment: "  " },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await ctx.request(`/parity/triage/item/${id}/decline`, {
          method: "POST",
          body: { comment: "Outside this project's scope" },
        })
      ).status,
    ).toBe(200);
    const task = await getTask(id);
    expect(
      await db.query.columnExtTable.findFirst({
        where: eq(columnExtTable.columnId, task.columnId!),
      }),
    ).toMatchObject({ category: "canceled" });
    expect(
      await db.query.activityTable.findMany({
        where: eq(schema.activityTable.taskId, id),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "comment",
          content: "Outside this project's scope",
        }),
        expect.objectContaining({ type: "triage_declined" }),
      ]),
    );
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)
      ).json(),
    ).toEqual({ count: 0 });
  });

  it("allows only one concurrent decision", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    const responses = await Promise.all([
      ctx.request(`/parity/triage/item/${id}/accept`, {
        method: "POST",
        body: { columnId: ctx.columns.todo.id },
      }),
      ctx.request(`/parity/triage/item/${id}/decline`, {
        method: "POST",
        body: { comment: "Declined" },
      }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await db.query.activityTable.findMany({
        where: and(
          eq(schema.activityTable.taskId, id),
          eq(schema.activityTable.type, "triage_created"),
        ),
      }),
    ).toHaveLength(1);
  });

  it("links a duplicate and notifies the member reporter", async () => {
    const ctx = await fixture();
    const target = await ctx.submit("Original");
    await ctx.request(`/parity/triage/item/${target}/accept`, {
      method: "POST",
      body: { columnId: ctx.columns.todo.id },
    });
    const id = await ctx.submit("Duplicate");
    expect(
      (
        await ctx.request(`/parity/triage/item/${id}/duplicate`, {
          method: "POST",
          body: { duplicateOfTaskId: target },
        })
      ).status,
    ).toBe(200);
    expect(
      await db.query.taskExtTable.findFirst({
        where: eq(taskExtTable.taskId, id),
      }),
    ).toMatchObject({ triageState: "duplicate", duplicateOfTaskId: target });
    expect(await db.query.taskRelationTable.findMany()).toContainEqual(
      expect.objectContaining({
        sourceTaskId: id,
        targetTaskId: target,
        relationType: "duplicate",
      }),
    );
    expect(await db.query.notificationTable.findMany()).toContainEqual(
      expect.objectContaining({
        userId: ctx.user.id,
        resourceId: id,
        type: "marked_duplicate",
      }),
    );
  });

  it("rejects self, pending, declined and inaccessible duplicate targets", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    const pending = await ctx.submit("Another pending item");
    const declined = await ctx.submit("Rejected submission");
    expect(
      (
        await ctx.request(`/parity/triage/item/${declined}/decline`, {
          method: "POST",
          body: { comment: "Out of scope" },
        })
      ).status,
    ).toBe(200);
    const other = await createRestrictedWorkspace();
    for (const [target, status] of [
      [id, 400],
      [pending, 400],
      [declined, 400],
      [other.alphaTask.id, 404],
    ] as const)
      expect(
        (
          await ctx.request(`/parity/triage/item/${id}/duplicate`, {
            method: "POST",
            body: { duplicateOfTaskId: target },
          })
        ).status,
      ).toBe(status);
    expect(await db.query.taskRelationTable.findMany()).toHaveLength(0);
  });

  it("snoozes until the deadline and wakes due items through the leased job", async () => {
    const ctx = await fixture();
    const id = await ctx.submit();
    const route = `/parity/triage/item/${id}/snooze`;
    expect(
      (
        await ctx.request(route, {
          method: "POST",
          body: { until: new Date(0).toISOString() },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await ctx.request(route, {
          method: "POST",
          body: { until: new Date(Date.now() + 86_400_000).toISOString() },
        })
      ).status,
    ).toBe(200);
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)
      ).json(),
    ).toEqual({ count: 0 });
    await wakeSnoozedTriage();
    expect(
      (
        await db.query.taskExtTable.findFirst({
          where: eq(taskExtTable.taskId, id),
        })
      )?.snoozedUntil,
    ).not.toBeNull();
    await db
      .update(taskExtTable)
      .set({ snoozedUntil: new Date(0) })
      .where(eq(taskExtTable.taskId, id));
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)
      ).json(),
    ).toEqual({ count: 1 });
    await wakeSnoozedTriage();
    expect(
      (
        await db.query.taskExtTable.findFirst({
          where: eq(taskExtTable.taskId, id),
        })
      )?.snoozedUntil,
    ).toBeNull();
  });
});

describe("triage settings and intake", () => {
  it("rotates and disables anonymous intake without exposing project details", async () => {
    const ctx = await fixture();
    const token = ctx.settings.intakeToken!;
    const body = {
      title: "Public report",
      description: "Details",
      reporterEmail: "reporter@example.com",
    };
    mockAnonymousSession();
    const response = await ctx.request(`/parity/triage/intake/${token}`, {
      method: "POST",
      body,
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ received: true });
    const settings = await updateTriageSettings(
      ctx.project.id,
      ctx.workspace.id,
      { rotateIntakeToken: true },
    );
    expect(settings.intakeToken).not.toBe(token);
    expect(
      (
        await ctx.request(`/parity/triage/intake/${token}`, {
          method: "POST",
          body,
        })
      ).status,
    ).toBe(404);
    await updateTriageSettings(ctx.project.id, ctx.workspace.id, {
      enabled: false,
    });
    expect(
      (
        await ctx.request(`/parity/triage/intake/${settings.intakeToken}`, {
          method: "POST",
          body,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await ctx.request(`/parity/triage/intake/${token}`, {
          method: "POST",
          body: { ...body, title: "" },
        })
      ).status,
    ).toBe(400);
  });

  it("preserves integration secrets and requires workspace settings permission to change routing", async () => {
    const ctx = await fixture();
    const [integration] = await db
      .insert(schema.integrationTable)
      .values({
        projectId: ctx.project.id,
        type: "github",
        config: JSON.stringify({
          secret: "never-return-this",
          repository: "test",
        }),
      })
      .returning();
    const body = { integrations: [{ id: integration.id, enabled: true }] };
    const response = await ctx.request(
      `/parity/triage/settings/${ctx.project.id}`,
      { method: "PUT", body },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("never-return-this");
    expect(
      JSON.parse(
        (await db.query.integrationTable.findFirst({
          where: eq(schema.integrationTable.id, integration.id),
        }))!.config,
      ),
    ).toEqual({
      secret: "never-return-this",
      repository: "test",
      parityTriageEnabled: true,
    });
    const member = await addWorkspaceMember(ctx.workspace.id);
    mockAuthenticatedSession(member);
    expect(
      (
        await ctx.request(`/parity/triage/settings/${ctx.project.id}`, {
          method: "PUT",
          body,
        })
      ).status,
    ).toBe(403);
    mockAuthenticatedSession(ctx.user);
    expect(
      (await ctx.request(`/parity/triage/settings/${ctx.project.id}`)).status,
    ).toBe(200);
    expect(
      (
        await db.query.projectExtTable.findFirst({
          where: eq(projectExtTable.projectId, ctx.project.id),
        })
      )?.triageEnabled,
    ).toBe(true);
  });

  it("stages integration tasks inside their transaction and rolls back together", async () => {
    const ctx = await fixture();
    for (const provider of ["github", "gitlab", "gitea"]) {
      await db.transaction(async (tx) => {
        const [task] = await tx
          .insert(schema.taskTable)
          .values({
            projectId: ctx.project.id,
            number: await claimTaskNumber(ctx.project.id, tx),
            title: provider,
            status: "to-do",
            columnId: ctx.columns.todo.id,
          })
          .returning();
        await stageIntegrationTriage(tx, task, {
          type: provider,
          config: '{"parityTriageEnabled":true}',
        });
        expect(task.status).toBe("triage");
      });
    }
    expect((await getTasks(ctx.project.id)).pagination.total).toBe(0);
    expect(
      await (
        await ctx.request(`/parity/triage/${ctx.workspace.id}/count`)
      ).json(),
    ).toEqual({ count: 3 });
    await expect(
      db.transaction(async (tx) => {
        const [task] = await tx
          .insert(schema.taskTable)
          .values({
            projectId: ctx.project.id,
            number: await claimTaskNumber(ctx.project.id, tx),
            title: "rollback",
            status: "to-do",
          })
          .returning();
        await stageIntegrationTriage(tx, task, {
          type: "github",
          config: '{"parityTriageEnabled":true}',
        });
        throw new Error("Abort import");
      }),
    ).rejects.toThrow("Abort import");
    expect(await db.query.taskTable.findMany()).toHaveLength(3);
    expect(await db.query.taskExtTable.findMany()).toHaveLength(3);
  });
});
