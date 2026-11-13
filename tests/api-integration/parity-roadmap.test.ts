import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import {
  initiativeProjectTable,
  initiativeTable,
  projectExtTable,
  projectMilestoneTable,
  taskExtTable,
} from "../../apps/api/src/database/schema-parity";
import { roadmapSchema } from "../../apps/api/src/parity/roadmap/schema";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("PARITY_FEATURES", "roadmap");
});
afterEach(() => vi.unstubAllEnvs());

it("returns compact plans, milestone progress and multiple initiative groups without hidden projects", async () => {
  const c = await createRestrictedWorkspace();
  await db.insert(projectExtTable).values({
    projectId: c.alpha.id,
    status: "started",
    leadId: c.owner.id,
    startDate: "2026-11-01",
    targetDate: "2026-12-01",
  });
  const milestones = await db
    .insert(projectMilestoneTable)
    .values([
      {
        projectId: c.alpha.id,
        name: "Visible milestone",
        targetDate: "2026-11-15",
      },
      { projectId: c.beta.id, name: "Hidden milestone" },
    ])
    .returning();
  await db
    .insert(taskExtTable)
    .values({ taskId: c.alphaTask.id, milestoneId: milestones[0].id });
  const groups = await db
    .insert(initiativeTable)
    .values([
      { workspaceId: c.workspace.id, name: "First", position: 0 },
      { workspaceId: c.workspace.id, name: "Second", position: 1 },
      { workspaceId: c.workspace.id, name: "Hidden only", position: 2 },
      { workspaceId: c.workspace.id, name: "Archived", archivedAt: new Date() },
    ])
    .returning();
  await db.insert(initiativeProjectTable).values([
    ...[groups[0], groups[1], groups[3]].map((group) => ({
      initiativeId: group.id,
      projectId: c.alpha.id,
    })),
    { initiativeId: groups[2].id, projectId: c.beta.id },
  ]);
  mockAuthenticatedSession(c.restricted);
  const response = await projectAccessApi()(
    `/parity/roadmap/${c.workspace.id}`,
  );
  expect(response.status).toBe(200);
  const result = roadmapSchema.parse(await response.json());
  expect(result.projects).toHaveLength(1);
  expect(result.projects[0]).toMatchObject({
    id: c.alpha.id,
    status: "started",
    leadId: c.owner.id,
    startDate: "2026-11-01",
    targetDate: "2026-12-01",
    initiativeIds: [groups[0].id, groups[1].id],
    progress: { total: 1, completed: 0 },
    milestones: [{ id: milestones[0].id, progress: { total: 1 } }],
  });
  expect(result.initiatives.map((group) => group.name)).toEqual([
    "First",
    "Second",
  ]);
  expect(JSON.stringify(result)).not.toContain(c.beta.id);
  expect(result.projects[0]).not.toHaveProperty("description");
  mockAuthenticatedSession(c.owner);
  const all = roadmapSchema.parse(
    await (
      await projectAccessApi()(`/parity/roadmap/${c.workspace.id}`)
    ).json(),
  );
  expect(all.projects).toHaveLength(2);
  expect(all.projects[1]).toMatchObject({
    id: c.beta.id,
    startDate: null,
    targetDate: null,
    status: "backlog",
  });
});

it("drops archived projects and stale cross-workspace initiative links", async () => {
  const c = await createRestrictedWorkspace();
  const other = await createWorkspaceMember();
  const [group] = await db
    .insert(initiativeTable)
    .values({ workspaceId: other.workspace.id, name: "Other workspace" })
    .returning();
  await db
    .insert(initiativeProjectTable)
    .values({ initiativeId: group.id, projectId: c.alpha.id });
  await db
    .update(schema.projectTable)
    .set({ archivedAt: new Date() })
    .where(eq(schema.projectTable.id, c.beta.id));
  mockAuthenticatedSession(c.owner);
  const result = roadmapSchema.parse(
    await (
      await projectAccessApi()(`/parity/roadmap/${c.workspace.id}`)
    ).json(),
  );
  expect(result.projects.map((project) => project.id)).toEqual([c.alpha.id]);
  expect(result.projects[0].initiativeIds).toEqual([]);
  expect(result.initiatives).toEqual([]);
});

it("enforces authentication, feature flags, membership and read permissions while allowing viewers", async () => {
  const c = await createRestrictedWorkspace();
  const request = projectAccessApi();
  const path = `/parity/roadmap/${c.workspace.id}`;
  mockAnonymousSession();
  expect((await request(path)).status).toBe(401);
  mockAuthenticatedSession(c.owner);
  vi.stubEnv("PARITY_FEATURES", "projects,initiatives");
  expect((await request(path)).status).toBe(404);
  vi.stubEnv("PARITY_FEATURES", "roadmap");
  const outsider = await createWorkspaceMember();
  mockAuthenticatedSession(outsider.user);
  expect((await request(path)).status).toBe(404);
  const viewer = await addWorkspaceMember(c.workspace.id, "viewer");
  mockAuthenticatedSession(viewer);
  expect((await request(path)).status).toBe(200);
  await db.insert(schema.workspaceRoleTable).values({
    workspaceId: c.workspace.id,
    role: "viewer",
    permission: JSON.stringify({ workspace: ["read"], project: ["read"] }),
  });
  expect((await request(path)).status).toBe(403);
});

it("returns an empty roadmap for an empty readable workspace", async () => {
  const c = await createWorkspaceMember();
  mockAuthenticatedSession(c.user);
  const response = await projectAccessApi()(
    `/parity/roadmap/${c.workspace.id}`,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ projects: [], initiatives: [] });
});

it("supports read-only API keys without widening their project visibility", async () => {
  const c = await createRestrictedWorkspace();
  const key = `roadmap-test-${c.restricted.id}`.padEnd(64, "x");
  await db.insert(schema.apikeyTable).values({
    referenceId: c.restricted.id,
    userId: c.restricted.id,
    key: createHash("sha256").update(key).digest("base64url"),
    createdAt: new Date(),
    updatedAt: new Date(),
    enabled: true,
    permissions: JSON.stringify({
      workspace: ["read"],
      project: ["read"],
      task: ["read"],
    }),
  });
  mockAnonymousSession();
  const request = projectAccessApi({ "x-api-key": key });
  const response = await request(`/parity/roadmap/${c.workspace.id}`);
  expect(response.status).toBe(200);
  expect(
    roadmapSchema
      .parse(await response.json())
      .projects.map((project) => project.id),
  ).toEqual([c.alpha.id]);
  expect(
    (
      await request(`/parity/project-plan/${c.alpha.id}`, {
        method: "PUT",
        body: { targetDate: "2026-12-01" },
      })
    ).status,
  ).toBe(403);
});
