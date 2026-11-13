import { and, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";
import db from "../../database";
import { projectTable, taskTable } from "../../database/schema";
import {
  cycleTable,
  favoriteTable,
  initiativeTable,
  savedViewTable,
} from "../../database/schema-parity";
import type { DbOrTx } from "../../project-access/db-or-tx";
import { workspaceIsActive } from "../../workspace/archive/active-workspace-sql";
import { enabledFeatures } from "../foundation/features";
import { readableProjects, type Actor } from "../planning/access";
import { visibleViews } from "./access";
import type { FavoriteTarget } from "./schema";
export const favoriteKey = (value: FavoriteTarget) =>
  JSON.stringify([value.kind, value.targetId]);

// Existence is deliberately independent of feature flags and access. Revoked,
// archived or temporarily hidden targets must keep their bookmarks.
export function favoriteTargetExists(database: DbOrTx) {
  return or(
    ...(
      [
        ["view", savedViewTable],
        ["project", projectTable],
        ["task", taskTable],
        ["cycle", cycleTable],
        ["initiative", initiativeTable],
      ] as const
    ).map(([kind, table]) =>
      and(
        eq(favoriteTable.kind, kind),
        exists(
          database
            .select({ id: table.id })
            .from(table)
            .where(eq(table.id, favoriteTable.targetId)),
        ),
      ),
    ),
  );
}

export async function readableFavoriteTargets(
  who: Actor,
  targets: FavoriteTarget[],
  database: DbOrTx = db,
) {
  const ids = (kind: FavoriteTarget["kind"]) =>
    targets
      .filter((target) => target.kind === kind)
      .map((target) => target.targetId);
  const features = enabledFeatures();
  const [views, projects, tasks, cycles, initiatives] = await Promise.all([
    ids("view").length
      ? database
          .select({
            id: savedViewTable.id,
            title: savedViewTable.name,
            projectId: savedViewTable.projectId,
          })
          .from(savedViewTable)
          .where(
            and(
              inArray(savedViewTable.id, ids("view")),
              visibleViews(who, database),
            ),
          )
      : [],
    ids("project").length
      ? database
          .select({
            id: projectTable.id,
            title: projectTable.name,
            projectId: projectTable.id,
          })
          .from(projectTable)
          .where(
            and(
              inArray(projectTable.id, ids("project")),
              readableProjects(who),
            ),
          )
      : [],
    ids("task").length
      ? database
          .select({
            id: taskTable.id,
            title: sql<string>`concat(${projectTable.slug}, '-', ${taskTable.number}, ' ', ${taskTable.title})`,
            projectId: projectTable.id,
          })
          .from(taskTable)
          .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
          .where(and(inArray(taskTable.id, ids("task")), readableProjects(who)))
      : [],
    ids("cycle").length && features.includes("cycles")
      ? database
          .select({
            id: cycleTable.id,
            title: sql<string>`coalesce(${cycleTable.name}, ${cycleTable.number}::text)`,
            projectId: sql<null>`null`,
          })
          .from(cycleTable)
          .where(
            and(
              inArray(cycleTable.id, ids("cycle")),
              eq(cycleTable.workspaceId, who.workspaceId),
              workspaceIsActive(cycleTable.workspaceId),
            ),
          )
      : [],
    ids("initiative").length && features.includes("initiatives")
      ? database
          .select({
            id: initiativeTable.id,
            title: initiativeTable.name,
            projectId: sql<null>`null`,
          })
          .from(initiativeTable)
          .where(
            and(
              inArray(initiativeTable.id, ids("initiative")),
              eq(initiativeTable.workspaceId, who.workspaceId),
              isNull(initiativeTable.archivedAt),
              workspaceIsActive(initiativeTable.workspaceId),
            ),
          )
      : [],
  ]);
  const result = new Map<string, { title: string; projectId: string | null }>();
  for (const [kind, rows] of [
    ["view", views],
    ["project", projects],
    ["task", tasks],
    ["cycle", cycles],
    ["initiative", initiatives],
  ] as const)
    for (const row of rows)
      result.set(favoriteKey({ kind, targetId: row.id }), {
        title: row.title,
        projectId: row.projectId,
      });
  return result;
}
export async function listFavorites(who: Actor, database: DbOrTx = db) {
  const rows = await database
    .select()
    .from(favoriteTable)
    .where(
      and(eq(favoriteTable.userId, who.userId), favoriteTargetExists(database)),
    )
    .orderBy(favoriteTable.position, favoriteTable.kind, favoriteTable.targetId)
    .limit(1000);
  const targets = await readableFavoriteTargets(who, rows, database);
  return rows.flatMap((row) => {
    const target = targets.get(favoriteKey(row));
    return target
      ? [
          {
            kind: row.kind,
            targetId: row.targetId,
            position: row.position,
            ...target,
          },
        ]
      : [];
  });
}
