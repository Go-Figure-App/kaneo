import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import * as events from "../../apps/api/src/events";
import { acceptTriage } from "../../apps/api/src/parity/triage/controllers/accept";
import { updateTriageSettings } from "../../apps/api/src/parity/triage/controllers/settings";
import { handleIssueOpened } from "../../apps/api/src/plugins/github/webhooks/issue-opened";
import { handleGiteaIssueOpened } from "../../apps/api/src/plugins/gitea/webhooks/issue-opened";
import { handleGitlabIssueOpened } from "../../apps/api/src/plugins/gitlab/webhooks/issue-opened";
import { canSyncTask } from "../../apps/api/src/plugins/sync/eligibility";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const provider = vi.hoisted(() => ({ labels: vi.fn(), comment: vi.fn() }));
vi.mock("../../apps/api/src/plugins/github/utils/github-app", () => ({
  getGithubApp: () => ({
    getInstallationOctokit: async () => ({
      rest: { issues: { createComment: provider.comment } },
    }),
  }),
}));
vi.mock("../../apps/api/src/plugins/gitea/utils/gitea-api", () => ({
  createGiteaClient: () => ({ createIssueComment: provider.comment }),
}));
vi.mock("../../apps/api/src/plugins/gitlab/utils/gitlab-api", () => ({
  createGitlabClient: () => ({ createIssueNote: provider.comment }),
}));
vi.mock("../../apps/api/src/plugins/github/utils/labels", () => ({
  addLabelsToIssue: provider.labels,
}));
vi.mock("../../apps/api/src/plugins/gitea/utils/labels", () => ({
  addLabelsToIssueGitea: provider.labels,
}));
vi.mock("../../apps/api/src/plugins/gitlab/utils/labels", () => ({
  addLabelsToIssueGitlab: provider.labels,
}));

beforeEach(async () => {
  await resetTestDatabase();
  provider.labels.mockReset().mockResolvedValue(undefined);
  provider.comment.mockReset().mockResolvedValue({ id: 123 });
});
afterEach(() => vi.unstubAllEnvs());

it.each(
  (["github", "gitea", "gitlab"] as const).flatMap((type) =>
    (["enabled", "flag-off", "opted-out"] as const).map((mode) => ({
      type,
      mode,
    })),
  ),
)(
  "preserves $type creation events and sync eligibility with triage $mode",
  async ({ type, mode }) => {
    const { user, workspace } = await createWorkspaceMember({ role: "owner" });
    const { project, columns } = await createProjectFixture({
      workspaceId: workspace.id,
    });
    await db.insert(schema.columnTable).values({
      projectId: project.id,
      name: "Triage",
      slug: "triage",
      position: 4,
    });
    await updateTriageSettings(project.id, workspace.id, { enabled: true });
    vi.stubEnv("PARITY_FEATURES", mode === "flag-off" ? "" : "triage");
    const baseUrl =
      type === "github" ? "https://github.com" : `https://${type}.example`;
    const [integration] = await db
      .insert(schema.integrationTable)
      .values({
        projectId: project.id,
        type,
        isActive: true,
        config: JSON.stringify({
          baseUrl,
          repositoryOwner: "team",
          repositoryName: "repo",
          repositoryId: 1,
          installationId: 2,
          verifiedGithubAccountId: "3",
          verifiedByUserId: user.id,
          accessToken: "test-only",
          projectPath: "team/repo",
          parityTriageEnabled: mode !== "opted-out",
        }),
      })
      .returning();
    const publish = vi
      .spyOn(events, "publishEvent")
      .mockResolvedValue(undefined);
    const issue = {
      number: 99,
      title: "Incoming report",
      body: "Provider report",
      html_url: `${baseUrl}/team/repo/issues/99`,
      labels: ["status:TRIAGE"],
      user: { login: "author" },
    };
    if (type === "github")
      await handleIssueOpened(
        {
          action: "opened",
          issue,
          installation: { id: 2 },
          repository: {
            id: 1,
            owner: { login: "team" },
            name: "repo",
            full_name: "team/repo",
          },
        },
        integration.id,
      );
    else if (type === "gitea")
      await handleGiteaIssueOpened(
        {
          action: "opened",
          issue,
          repository: {
            owner: { login: "team" },
            name: "repo",
            html_url: `${baseUrl}/team/repo`,
          },
        },
        integration.id,
      );
    else
      await handleGitlabIssueOpened(
        {
          object_attributes: {
            iid: 99,
            title: issue.title,
            description: issue.body,
            url: issue.html_url,
          },
          labels: issue.labels.map((title) => ({ title })),
          project: {
            name: "repo",
            path_with_namespace: "team/repo",
            web_url: `${baseUrl}/team/repo`,
          },
        },
        integration.id,
      );

    const [task] = await db.query.taskTable.findMany();
    expect(task.status).toBe("triage");
    const pending = mode === "enabled";
    const ext = await db.query.taskExtTable.findFirst({
      where: eq(schema.taskExtTable.taskId, task.id),
    });
    expect(ext?.triageState ?? null).toBe(pending ? "pending" : null);
    expect(task.columnId === null).toBe(pending);
    expect(publish).toHaveBeenCalledWith(
      pending ? "parity.triage_created" : "task.created",
      expect.objectContaining({ taskId: task.id }),
    );
    expect(publish).not.toHaveBeenCalledWith(
      pending ? "task.created" : "parity.triage_created",
      expect.anything(),
    );
    expect(provider.labels).toHaveBeenCalledTimes(pending ? 0 : 1);
    expect(provider.comment).toHaveBeenCalledTimes(pending ? 0 : 1);
    expect(await canSyncTask(task.id, integration.id)).toBe(!pending);
    const link = await db.query.externalLinkTable.findFirst();
    expect(JSON.parse(link!.metadata ?? "{}").syncFilterPaused).not.toBe(true);
    if (pending) {
      await acceptTriage(
        task.id,
        { userId: user.id, workspaceId: workspace.id },
        { columnId: columns.todo.id },
      );
      expect(await canSyncTask(task.id, integration.id)).toBe(true);
    }
  },
);
