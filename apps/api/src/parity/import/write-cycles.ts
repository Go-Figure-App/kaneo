import { eq } from "drizzle-orm";
import { cycleTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import type { ProjectPlanning } from "./types";
import { importId, instant, requiredInstant } from "./values";

export async function writeImportCycles(
  tx: Transaction,
  workspaceId: string,
  runId: string,
  data: ProjectPlanning,
) {
  const warnings: string[] = [];
  const existing = await tx
    .select({ id: cycleTable.id, number: cycleTable.number })
    .from(cycleTable)
    .where(eq(cycleTable.workspaceId, workspaceId));
  const used = new Set(existing.map((row) => row.number));
  const known = new Set(existing.map((row) => row.id));
  let highest = existing.reduce((max, row) => Math.max(max, row.number), 0);
  const cycleIds = new Map<string, string>();
  const referenced = new Set(
    data.issues.flatMap((issue) => (issue.cycle ? [issue.cycle.id] : [])),
  );
  for (const cycle of data.workspace.cycles.filter(
    (row) => data.teamIds.includes(row.team.id) || referenced.has(row.id),
  )) {
    const id = importId(runId, "cycle", cycle.id);
    cycleIds.set(cycle.id, id);
    if (known.has(id)) continue;
    const startsAt = instant(cycle.startsAt);
    const endsAt = instant(cycle.endsAt);
    if (!startsAt || !endsAt || endsAt <= startsAt)
      throw new Error("Linear returned invalid cycle dates.");
    let number = cycle.number;
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 2_147_483_647 ||
      used.has(number)
    ) {
      number = highest + 1;
      warnings.push(
        `A source cycle number was already used or invalid; imported it as cycle ${number}. Its name retains the source team and number.`,
      );
    }
    if (number > 2_147_483_647)
      throw new Error("There is no remaining workspace cycle number.");
    used.add(number);
    highest = Math.max(highest, number);
    const team = data.workspace.teams.find((row) => row.id === cycle.team.id);
    const past = endsAt <= new Date();
    const completedAt = instant(cycle.completedAt) ?? (past ? endsAt : null);
    await tx.insert(cycleTable).values({
      id,
      workspaceId,
      number,
      name: `${team?.key ?? "Linear"} ${cycle.number}${cycle.name ? ` · ${cycle.name}` : ""}`,
      startsAt,
      endsAt,
      completedAt,
      summary: null,
      createdAt: requiredInstant(cycle.createdAt, "cycle createdAt"),
      updatedAt: requiredInstant(cycle.updatedAt, "cycle updatedAt"),
    });
    if (past && !cycle.completedAt)
      warnings.push(
        "A past cycle had no recorded completion time; it was closed at its scheduled end to prevent automatic rollover of imported work.",
      );
  }
  if (cycleIds.size)
    warnings.push(
      "Cycles and issue membership were imported. Historical burndown and rollover totals are unavailable because Linear's aggregate history cannot be attributed safely to destination projects.",
    );
  return { cycleIds, warnings };
}
