import { eq } from "drizzle-orm";
import db from "../../database";
import { taskRelationTable } from "../../database/schema";
import { taskExtTable } from "../../database/schema-parity";
import type { ImportRunProject } from "../../import/import-run-project";
import { publishEvent } from "../../events";
import type { CommittedProject } from "./write-project";

export type PlanningFinishInput = {
  workspaceId: string;
  projects: ImportRunProject[];
  signal: AbortSignal;
};
export async function finishPlanningImport(
  committed: CommittedProject[],
  input: PlanningFinishInput,
): Promise<ImportRunProject[]> {
  const tasks = new Map(committed.flatMap((project) => [...project.tasks]));
  const owners = new Map(
    committed.flatMap((project) =>
      [...project.tasks.keys()].map(
        (id) => [id, project.data.sourceId] as const,
      ),
    ),
  );
  const relations = new Map<
    string,
    { source: string; target: string; type: string }
  >();
  const counts = new Map<string, number>();
  const skipped = new Set<string>();
  const add = (source: string, target: string, type: string) => {
    if (source === target) return;
    if (!tasks.has(source) || !tasks.has(target)) {
      const owner = owners.get(source) ?? owners.get(target);
      if (owner) skipped.add(owner);
      return;
    }
    const pair =
      type === "related" ? [source, target].sort() : [source, target];
    relations.set(JSON.stringify([type, ...pair]), {
      source: pair[0]!,
      target: pair[1]!,
      type,
    });
  };
  for (const project of committed) {
    for (const issue of project.data.issues)
      if (issue.parent) add(issue.parent.id, issue.id, "subtask");
  }
  // Every committed project shares the same workspace collection.
  for (const relation of committed[0]?.data.workspace.relations ?? []) {
    const type = relation.type === "similar" ? "related" : relation.type;
    if (["blocks", "related", "duplicate"].includes(type))
      add(relation.issue.id, relation.relatedIssue.id, type);
  }
  await db.transaction(async (tx) => {
    for (const relation of relations.values()) {
      input.signal.throwIfAborted();
      const sourceTaskId = tasks.get(relation.source)!;
      const targetTaskId = tasks.get(relation.target)!;
      await tx
        .insert(taskRelationTable)
        .values({ sourceTaskId, targetTaskId, relationType: relation.type });
      const owner = owners.get(relation.source)!;
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
      if (relation.type === "duplicate")
        await tx
          .update(taskExtTable)
          .set({ duplicateOfTaskId: targetTaskId })
          .where(eq(taskExtTable.taskId, sourceTaskId));
    }
  });
  await publishEvent("parity.workspace_updated", {
    workspaceId: input.workspaceId,
  });
  return input.projects.map((project) => ({
    ...project,
    counts: {
      ...project.counts,
      relations: project.counts.relations + (counts.get(project.sourceId) ?? 0),
    },
    warnings: [
      ...project.warnings,
      ...(skipped.has(project.sourceId)
        ? [
            "Links to issues outside the successfully imported projects were omitted.",
          ]
        : []),
    ],
  }));
}
