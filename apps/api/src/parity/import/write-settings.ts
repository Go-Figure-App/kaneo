import { eq } from "drizzle-orm";
import { workspaceExtTable } from "../../database/schema-parity";
import type { Transaction } from "../planning/access";
import type { ProjectPlanning } from "./types";
import { estimateScale, timeZone } from "./values";

export async function writeImportSettings(
  tx: Transaction,
  workspaceId: string,
  data: ProjectPlanning,
) {
  const warnings: string[] = [];
  const teams = data.workspace.teams
    .filter((team) => data.teamIds.includes(team.id))
    .sort((a, b) => a.key.localeCompare(b.key));
  const first = teams[0];
  const scale = first ? estimateScale(first.issueEstimationType) : "none";
  const zone = first ? timeZone(first.timezone) : "UTC";
  await tx
    .insert(workspaceExtTable)
    .values({
      workspaceId,
      estimateScale: scale ?? "none",
      timeZone: zone,
      cyclesEnabled: false,
    })
    .onConflictDoNothing();
  const [settings] = await tx
    .select()
    .from(workspaceExtTable)
    .where(eq(workspaceExtTable.workspaceId, workspaceId))
    .for("update");
  if (
    teams.some(
      (team) =>
        estimateScale(team.issueEstimationType) !== settings?.estimateScale,
    )
  )
    warnings.push(
      "Source team estimate scales differ from the destination workspace. Original numeric estimates were retained; existing workspace settings were not changed.",
    );
  if (teams.some((team) => timeZone(team.timezone) !== settings?.timeZone))
    warnings.push(
      "Source team timezones differ from the destination workspace. Cycle instants were retained; existing workspace settings were not changed.",
    );
  return warnings;
}
