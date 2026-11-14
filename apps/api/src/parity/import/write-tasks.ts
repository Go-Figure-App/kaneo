import { and, eq } from "drizzle-orm";
import {
  activityTable,
  externalLinkTable,
  taskTable,
} from "../../database/schema";
import { taskExtTable } from "../../database/schema-parity";
import type {
  BoardColumn,
  PlannedImportTask,
} from "../../import/writer/plan-import-tasks";
import type { Transaction } from "../planning/access";
import type { ProjectPlanning } from "./types";
import type { ImportIdentity } from "./types";
import { importId, instant, requiredInstant } from "./values";

export async function writeTaskPlanning(
  tx: Transaction,
  input: {
    runId: string;
    data: ProjectPlanning;
    tasks: PlannedImportTask[];
    columns: ReadonlyMap<string, BoardColumn>;
    cycleIds: ReadonlyMap<string, string>;
    milestoneIds: ReadonlyMap<string, string>;
    identify: ImportIdentity;
  },
) {
  const warnings = new Set<string>();
  const issues = new Map(input.data.issues.map((issue) => [issue.id, issue]));
  for (const task of input.tasks) {
    const issue = issues.get(task.key);
    if (!issue) throw new Error("The imported task has no Linear metadata.");
    const estimate =
      issue.estimate !== null &&
      Number.isInteger(issue.estimate) &&
      issue.estimate >= 0 &&
      issue.estimate <= 1_000_000
        ? issue.estimate
        : null;
    if (issue.estimate !== null && estimate === null)
      warnings.add(
        "Unsupported fractional, negative or oversized source estimates were left unset.",
      );
    const cycleId = issue.cycle
      ? (input.cycleIds.get(issue.cycle.id) ?? null)
      : null;
    const milestoneId = issue.projectMilestone
      ? (input.milestoneIds.get(issue.projectMilestone.id) ?? null)
      : null;
    if (issue.cycle && !cycleId)
      warnings.add(
        "Some issue cycles were not readable in Linear and were left unassigned.",
      );
    if (issue.projectMilestone && !milestoneId)
      warnings.add(
        "Some milestones were not in the imported project and were left unassigned.",
      );
    await tx.insert(taskExtTable).values({
      taskId: task.id,
      estimate,
      cycleId,
      milestoneId,
      triageState:
        issue.state.type === "triage"
          ? "pending"
          : issue.state.type === "duplicate"
            ? "duplicate"
            : "accepted",
      triageSource: "linear",
      triagedAt: instant(issue.triagedAt),
      snoozedUntil: instant(issue.snoozedUntilAt),
      startedAt: instant(issue.startedAt),
      completedAt: instant(issue.completedAt),
      canceledAt: instant(issue.canceledAt),
    });
    const updatedAt = requiredInstant(issue.updatedAt, "issue update");
    requiredInstant(issue.createdAt, "issue creation");
    await tx
      .update(taskTable)
      .set({ updatedAt })
      .where(eq(taskTable.id, task.id));
    await tx
      .update(activityTable)
      .set({ userId: input.identify(issue.creator) })
      .where(
        and(
          eq(activityTable.taskId, task.id),
          eq(activityTable.type, "created"),
        ),
      );
    let url: URL;
    try {
      url = new URL(issue.url);
    } catch {
      throw new Error("Linear returned an invalid issue URL.");
    }
    if (
      url.protocol !== "https:" ||
      url.hostname !== "linear.app" ||
      url.username ||
      url.password
    )
      throw new Error("Linear returned an unsupported issue URL.");
    await tx.insert(externalLinkTable).values({
      id: importId(input.runId, "issue-link", issue.id),
      taskId: task.id,
      resourceType: "issue",
      externalId: issue.identifier,
      url: url.href,
      title: issue.identifier,
      metadata: JSON.stringify({
        source: "linear",
        sourceId: issue.id,
        identifier: issue.identifier,
      }),
    });
    const history = [...issue.stateHistory.nodes].sort(
      (a, b) => +new Date(a.startedAt) - +new Date(b.startedAt),
    );
    const valid = history.every((span, index) => {
      const previous = history[index - 1];
      return (
        input.columns.has(span.stateId) &&
        instant(span.startedAt) &&
        (!previous ||
          instant(previous.endedAt)?.getTime() ===
            instant(span.startedAt)?.getTime())
      );
    });
    if (!valid) {
      warnings.add(
        "Incomplete workflow history was omitted instead of inventing durations; recorded lifecycle timestamps were retained.",
      );
      continue;
    }
    for (const [index, span] of history.entries()) {
      const current = input.columns.get(span.stateId)!;
      const prior = history[index - 1];
      const oldStatus = prior
        ? input.columns.get(prior.stateId)?.slug
        : instant(span.startedAt)?.getTime() ===
            instant(issue.createdAt)?.getTime()
          ? current.slug
          : undefined;
      await tx.insert(activityTable).values({
        id: importId(input.runId, "state-span", `${issue.id}:${span.id}`),
        taskId: task.id,
        type: "status_changed",
        userId: null,
        createdAt: instant(span.startedAt)!,
        content: null,
        eventData: {
          ...(oldStatus ? { oldStatus } : {}),
          newStatus: current.slug,
        },
        externalSource: "linear",
        externalUrl: `${url.href}#state-${encodeURIComponent(span.id)}`,
      });
    }
  }
  return [...warnings];
}
