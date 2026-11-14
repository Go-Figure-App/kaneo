import { and, eq } from "drizzle-orm";
import {
  projectTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import {
  columnExtTable,
  projectExtTable,
  projectMilestoneTable,
} from "../../database/schema-parity";
import { createImportProject } from "../../import/writer/create-import-project";
import { writeProjectContent } from "../../import/writer/write-project-content";
import { createAssigneeMatcher } from "../../import/writer/match-assignees";
import { loadAssignableMembers } from "../../import/writer/load-assignable-members";
import type {
  WrittenImportProject,
  WriteImportedProjectInput,
} from "../../import/write-imported-project";
import { publishEvent } from "../../events";
import { category, person, priority, projectStates } from "./mapping";
import type { ProjectPlanning } from "./types";
import {
  dateOnly,
  health,
  importId,
  instant,
  requiredInstant,
  projectStatus,
} from "./values";
import { writeSharedPlanning } from "./write-shared";
import { writeUpdates } from "./write-updates";
import { writeTaskPlanning } from "./write-tasks";
import { writeInitiativeProjects } from "./write-initiative-projects";

export type PlanningWriteInput = WriteImportedProjectInput & {
  runId: string;
  sourceProjectId: string;
  selectedProjectIds: string[];
  signal?: AbortSignal;
};
export type CommittedProject = {
  data: ProjectPlanning;
  tasks: Map<string, string>;
  projectId: string;
};

export async function writePlanningProject(
  input: PlanningWriteInput,
  data: ProjectPlanning,
  includeEmptyInitiatives: boolean,
): Promise<WrittenImportProject & { committed: CommittedProject }> {
  const { workspaceId, userId, project, runId } = input;
  input.signal?.throwIfAborted();
  const written = await createImportProject(
    {
      workspaceId,
      userId,
      name: project.name,
      preferredKey: project.key,
      signal: input.signal,
    },
    async (tx, created) => {
      const members = await tx
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
        })
        .from(workspaceUserTable)
        .innerJoin(userTable, eq(userTable.id, workspaceUserTable.userId))
        .where(eq(workspaceUserTable.workspaceId, workspaceId));
      const workspacePeople = createAssigneeMatcher(members);
      const projectPeople = createAssigneeMatcher(
        await loadAssignableMembers(tx, workspaceId, created.id),
      );
      const identify = (value: Parameters<typeof person>[0]) =>
        workspacePeople.match(person(value));
      const identifyProjectPerson = (value: Parameters<typeof person>[0]) =>
        projectPeople.match(person(value));
      const shared = await writeSharedPlanning(tx, {
        runId,
        workspaceId,
        data,
        includeEmptyInitiatives,
        identify,
      });
      const warnings = [...shared.warnings];
      const source = data.project;
      let startDate = dateOnly(source?.startDate);
      const targetDate = dateOnly(source?.targetDate);
      if (startDate && targetDate && targetDate < startDate) {
        startDate = null;
        warnings.push(
          "A project target preceded its start; the target was retained and the invalid start cleared.",
        );
      }
      await tx.insert(projectExtTable).values({
        projectId: created.id,
        status: source ? projectStatus(source.status.type) : "backlog",
        health: health(source?.health ?? null),
        leadId: identifyProjectPerson(source?.lead),
        startDate,
        targetDate,
        priority: priority(source?.priority ?? 0),
        triageEnabled: data.issues.some(
          (issue) => issue.state.type === "triage",
        ),
      });
      const milestoneIds = new Map<string, string>();
      for (const [position, milestone] of [...data.milestones]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .entries()) {
        if (milestone.project.id !== source?.id)
          throw new Error("Linear returned a milestone from another project.");
        const id = importId(runId, "milestone", milestone.id);
        milestoneIds.set(milestone.id, id);
        await tx.insert(projectMilestoneTable).values({
          id,
          projectId: created.id,
          name: milestone.name,
          description: milestone.description ?? "",
          targetDate: dateOnly(milestone.targetDate),
          position,
          createdAt: requiredInstant(
            milestone.createdAt,
            "milestone createdAt",
          ),
          updatedAt: requiredInstant(
            milestone.updatedAt,
            "milestone updatedAt",
          ),
        });
        if (milestone.archivedAt)
          warnings.push(
            "An archived milestone was retained as a normal milestone because this fork has no milestone archive state.",
          );
      }
      await writeUpdates(
        tx,
        runId,
        "project",
        created.id,
        data.updates,
        identifyProjectPerson,
      );
      await writeInitiativeProjects(tx, data, created.id, shared.initiativeIds);
      let tasks = new Map<string, string>();
      const content = await writeProjectContent(tx, {
        projectId: created.id,
        workspaceId,
        userId,
        source: "linear",
        project,
        includeComments: input.includeComments,
        afterWrite: async ({ tasks: writtenTasks, columns }) => {
          tasks = new Map(writtenTasks.map((task) => [task.key, task.id]));
          for (const state of projectStates(data)) {
            const column = columns.get(state.id);
            if (column)
              await tx.insert(columnExtTable).values({
                columnId: column.id,
                category: category(state.type),
              });
          }
          warnings.push(
            ...(await writeTaskPlanning(tx, {
              runId,
              data,
              tasks: writtenTasks,
              columns,
              cycleIds: shared.cycleIds,
              milestoneIds,
              identify: identifyProjectPerson,
            })),
          );
        },
      });
      if (source)
        await tx
          .update(projectTable)
          .set({
            archivedAt: instant(source.archivedAt),
            createdAt: requiredInstant(source.createdAt, "project creation"),
          })
          .where(
            and(
              eq(projectTable.id, created.id),
              eq(projectTable.workspaceId, workspaceId),
            ),
          );
      if (workspacePeople.warning() || projectPeople.warning())
        warnings.push(
          "Some source people could not be matched to existing destination members. Their ownership and authorship were left unassigned.",
        );
      input.signal?.throwIfAborted();
      return {
        projectId: created.id,
        projectSlug: created.slug,
        counts: content.counts,
        warnings: [...new Set([...content.warnings, ...warnings])],
        committed: { data, tasks, projectId: created.id },
      };
    },
  );
  await publishEvent("project.updated", { projectId: written.projectId });
  await publishEvent("parity.workspace_updated", { workspaceId });
  return written;
}
