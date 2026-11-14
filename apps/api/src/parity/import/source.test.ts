import { describe, expect, it, vi } from "vite-plus/test";
import { collectPages } from "./pagination";
import { connectPlanningSource } from "./source";
import { category } from "./mapping";
import { fixtureFetch, linearFixture, page } from "./__fixtures__/linear";

describe("Linear planning source", () => {
  it("finishes nested project teams, labels, comments and history pages", async () => {
    const fixture = linearFixture();
    const issue = fixture.issues.get("project-a")![0]!;
    const extraLabel = {
      id: "label-more",
      name: "More",
      color: null,
      parent: null,
    };
    const extraComment = {
      ...issue.comments!.nodes[0]!,
      id: "comment-more",
      body: "Second page",
    };
    const spans = issue.stateHistory.nodes;
    issue.stateHistory.nodes = spans.slice(0, 1);
    for (const connection of [
      fixture.projects[0]!.teams,
      issue.labels,
      issue.comments!,
      issue.stateHistory,
    ])
      connection.pageInfo = { hasNextPage: true, endCursor: "next" };
    const base = fixtureFetch(fixture);
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      const { query, variables } = JSON.parse(String(init?.body));
      for (const [operation, key, nodes] of [
        ["IssueLabels", "labels", [extraLabel]],
        ["IssueComments", "comments", [extraComment]],
        ["IssueHistory", "stateHistory", spans.slice(1)],
      ] as const) {
        if (query.includes(`query Planning${operation}`)) {
          expect(variables).toEqual({ id: issue.id, after: "next" });
          return Response.json({
            data: { issue: { [key]: page<unknown>([...nodes]) } },
          });
        }
      }
      if (query.includes("query PlanningProjectTeams")) {
        expect(variables.after).toBe("next");
        return Response.json({
          data: { project: { teams: page([{ id: "team-more" }]) } },
        });
      }
      return base(url, init);
    });
    const planning = await connectPlanningSource({
      apiKey: "synthetic",
      fetch,
    });
    await planning.source.listProjects();
    const project = await planning.source.readProject("project:project-a", {
      includeComments: true,
    });
    expect(project.tasks[0]!.comments).toHaveLength(2);
    expect(project.labels.some((label) => label.key === extraLabel.id)).toBe(
      true,
    );
    const metadata = planning.metadata.get(project)!;
    expect(metadata.teamIds).toContain("team-more");
    expect(metadata.issues[0]!.stateHistory.nodes).toHaveLength(3);
  });
  it("lists actual projects and per-team catch-alls, retaining metadata and history", async () => {
    const fetch = vi.fn(fixtureFetch(linearFixture()));
    const planning = await connectPlanningSource({
      apiKey: "synthetic-test-key",
      fetch,
    });
    expect((await planning.source.listProjects()).map((row) => row.id)).toEqual(
      ["project:project-a", "project:project-b", "team:team-a"],
    );
    const project = await planning.source.readProject("project:project-a", {
      includeComments: true,
    });
    expect(project.name).toBe("Launch");
    expect(project.tasks[0]).toMatchObject({
      number: 42,
      title: "Issue 42",
      comments: [{ body: "Imported comment" }],
    });
    expect(planning.metadata.get(project)).toMatchObject({
      issues: [
        {
          estimate: 3,
          completedAt: "2024-01-05T00:00:00.000Z",
          stateHistory: { nodes: [{}, {}, {}] },
        },
      ],
      milestones: [{ name: "Beta" }],
    });
    const catchall = await planning.source.readProject("team:team-a", {
      includeComments: false,
    });
    expect(catchall.name).toBe("Engineering — No project");
    expect(catchall.tasks[0]?.comments).toEqual([]);
    const requests = fetch.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    expect(
      requests.find((request) => request.variables.filter?.team)?.variables
        .filter,
    ).toEqual({ team: { id: { eq: "team-a" } }, project: { null: true } });
    expect(
      requests.filter((request) =>
        request.query.includes("query Planningcycles"),
      ),
    ).toHaveLength(1);
  });
  it("preserves archived tasks and rejects an unlisted source", async () => {
    const fixture = linearFixture();
    fixture.issues.get("project-a")![0]!.archivedAt =
      "2024-02-01T00:00:00.000Z";
    const planning = await connectPlanningSource({
      apiKey: "test",
      fetch: fixtureFetch(fixture),
    });
    await planning.source.listProjects();
    expect(
      (
        await planning.source.readProject("project:project-a", {
          includeComments: false,
        })
      ).tasks[0]?.archived,
    ).toBe(true);
    await expect(
      planning.source.readProject("project:missing", {
        includeComments: false,
      }),
    ).rejects.toThrow("listed");
    expect(category("triage")).toBe("backlog");
    expect(category("duplicate")).toBe("canceled");
  });
});
describe("Linear pagination", () => {
  it("continues a nested initial page without rereading it", async () => {
    const read = vi.fn(async () => page([2]));
    expect(
      await collectPages(read, {
        nodes: [1],
        pageInfo: { hasNextPage: true, endCursor: "next" },
      }),
    ).toEqual([1, 2]);
    expect(read).toHaveBeenCalledExactlyOnceWith("next");
  });
  it("rejects missing or repeated cursors instead of accepting a partial import", async () => {
    for (const endCursor of [null, "repeat"]) {
      await expect(
        collectPages(async () => ({
          nodes: [],
          pageInfo: { hasNextPage: true, endCursor },
        })),
      ).rejects.toThrow("did not advance");
    }
  });
});
