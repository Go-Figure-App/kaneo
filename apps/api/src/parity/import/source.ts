import type {
  ImportedProject,
  ImportSource,
  SourceProject,
} from "@tracing/importers";
import type { LinearGraphQLOptions } from "@tracing/importers/linear";
import { mapProject } from "./mapping";
import { PlanningReader } from "./reader";
import type {
  Project,
  ProjectPlanning,
  Team,
  WorkspacePlanning,
} from "./types";

export type PlanningSource = {
  source: ImportSource;
  metadata: WeakMap<ImportedProject, ProjectPlanning>;
  availableIds: () => string[];
};
export async function connectPlanningSource(
  options: LinearGraphQLOptions,
): Promise<PlanningSource> {
  const reader = new PlanningReader(options);
  await reader.authenticate();
  const metadata = new WeakMap<ImportedProject, ProjectPlanning>();
  let catalog: { teams: Team[]; projects: Project[] } | undefined;
  let workspace: Promise<WorkspacePlanning> | undefined;
  const availableIds = () =>
    catalog
      ? [
          ...catalog.projects.map((project) => `project:${project.id}`),
          ...catalog.teams.map((team) => `team:${team.id}`),
        ]
      : [];
  const source: ImportSource = {
    async listProjects(): Promise<SourceProject[]> {
      const [teams, projects] = await Promise.all([
        reader.teams(),
        reader.projects(),
      ]);
      catalog = { teams, projects };
      return [
        ...projects.map((project) => ({
          id: `project:${project.id}`,
          name: project.name,
          detail: "Linear project · includes planning metadata",
        })),
        ...teams.map((team) => ({
          id: `team:${team.id}`,
          name: `${team.name} — No project`,
          detail: `${team.key} · issues without a Linear project`,
        })),
      ];
    },
    async readProject(sourceId, options) {
      if (!catalog || !availableIds().includes(sourceId))
        throw new Error("Select a listed Linear project or team catch-all.");
      const scoped = reader.withSignal(options.signal);
      options.onProgress?.("Reading workspace planning");
      workspace ??= scoped.workspace(catalog.teams).catch((error) => {
        workspace = undefined;
        throw error;
      });
      const shared = await workspace;
      const project =
        catalog.projects.find((row) => `project:${row.id}` === sourceId) ??
        null;
      const team = project
        ? undefined
        : catalog.teams.find((row) => `team:${row.id}` === sourceId);
      const teamIds = project
        ? project.teams.nodes.map((row) => row.id)
        : [team!.id];
      const filter = project
        ? { project: { id: { eq: project.id } } }
        : { team: { id: { eq: team!.id } }, project: { null: true } };
      options.onProgress?.("Reading issues");
      const issues = await scoped.issues(
        filter,
        options.includeComments,
        options.onProgress,
      );
      for (const issue of issues)
        if (!teamIds.includes(issue.team.id)) teamIds.push(issue.team.id);
      const milestones = project ? await scoped.milestones(project.id) : [];
      const updates = project ? await scoped.updates(project.id) : [];
      const data: ProjectPlanning = {
        sourceId,
        project,
        teamIds,
        issues,
        milestones,
        updates,
        workspace: shared,
      };
      const imported = mapProject(data);
      metadata.set(imported, data);
      return imported;
    },
  };
  return { source, metadata, availableIds };
}
