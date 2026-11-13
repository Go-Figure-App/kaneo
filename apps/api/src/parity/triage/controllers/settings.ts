import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../../database";
import {
  columnTable,
  integrationTable,
  projectTable,
} from "../../../database/schema";
import {
  columnExtTable,
  projectExtTable,
} from "../../../database/schema-parity";
import { publishEvent } from "../../../events";
import { assertAssignableUser } from "../../../utils/assert-assignable-user";
import { defaultCategory } from "../../foundation/categories";
import { workspaceIsActive } from "../../../workspace/archive/active-workspace-sql";
import {
  integrationConfig,
  integrationTriageEnabled,
  triageIntegrationTypes,
} from "../integration-config";
import type { SettingsInput } from "../schema";

export async function getTriageSettings(
  projectId: string,
  workspaceId: string,
) {
  const [record] = await db
    .select({ settings: projectExtTable })
    .from(projectTable)
    .leftJoin(projectExtTable, eq(projectExtTable.projectId, projectTable.id))
    .where(
      and(
        eq(projectTable.id, projectId),
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
        workspaceIsActive(projectTable.workspaceId),
      ),
    );
  if (!record) throw new HTTPException(404, { message: "Project not found" });
  const settings = record.settings;
  const integrations = await db
    .select({
      id: integrationTable.id,
      type: integrationTable.type,
      config: integrationTable.config,
    })
    .from(integrationTable)
    .where(
      and(
        eq(integrationTable.projectId, projectId),
        inArray(integrationTable.type, triageIntegrationTypes),
      ),
    );
  return {
    enabled: settings?.triageEnabled ?? false,
    ownerId: settings?.triageOwnerId ?? null,
    intakeToken: settings?.intakeToken ?? null,
    integrations: integrations.map(({ id, type, config }) => ({
      id,
      type,
      enabled: integrationTriageEnabled(config),
    })),
  };
}

export async function updateTriageSettings(
  projectId: string,
  workspaceId: string,
  input: SettingsInput,
) {
  const createdColumn = await db.transaction(async (tx) => {
    // Importers hold their integration lock before claiming a project task number.
    if (input.integrations?.length)
      await tx
        .select({ id: integrationTable.id })
        .from(integrationTable)
        .where(
          and(
            eq(integrationTable.projectId, projectId),
            inArray(
              integrationTable.id,
              input.integrations.map((item) => item.id),
            ),
          ),
        )
        .orderBy(integrationTable.id)
        .for("update");
    const [project] = await tx
      .select()
      .from(projectTable)
      .where(
        and(
          eq(projectTable.id, projectId),
          eq(projectTable.workspaceId, workspaceId),
          isNull(projectTable.archivedAt),
          workspaceIsActive(projectTable.workspaceId),
        ),
      )
      .for("update");
    if (!project)
      throw new HTTPException(404, { message: "Project not found" });
    if (input.ownerId)
      await assertAssignableUser(input.ownerId, workspaceId, projectId, tx);
    const [existing] = await tx
      .select()
      .from(projectExtTable)
      .where(eq(projectExtTable.projectId, projectId));
    const triageEnabled = input.enabled ?? existing?.triageEnabled ?? false;
    const intakeToken =
      input.rotateIntakeToken || (triageEnabled && !existing?.intakeToken)
        ? randomBytes(32).toString("base64url")
        : (existing?.intakeToken ?? null);
    const settings = {
      triageEnabled,
      triageOwnerId:
        input.ownerId === undefined
          ? (existing?.triageOwnerId ?? null)
          : input.ownerId,
      intakeToken,
    };
    await tx
      .insert(projectExtTable)
      .values({ projectId, ...settings })
      .onConflictDoUpdate({ target: projectExtTable.projectId, set: settings });
    for (const change of input.integrations ?? []) {
      const [integration] = await tx
        .select()
        .from(integrationTable)
        .where(
          and(
            eq(integrationTable.id, change.id),
            eq(integrationTable.projectId, projectId),
            inArray(integrationTable.type, triageIntegrationTypes),
          ),
        )
        .for("update");
      if (!integration)
        throw new HTTPException(404, { message: "Integration not found" });
      let config: Record<string, unknown>;
      try {
        config = integrationConfig(integration.config);
      } catch {
        throw new HTTPException(409, {
          message:
            "Repair the integration configuration before changing triage",
        });
      }
      await tx
        .update(integrationTable)
        .set({
          config: JSON.stringify({
            ...config,
            parityTriageEnabled: change.enabled,
          }),
        })
        .where(eq(integrationTable.id, integration.id));
    }
    if (!triageEnabled) return null;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(1525, hashtext(${projectId}))`,
    );
    const columns = await tx
      .select({ column: columnTable, category: columnExtTable.category })
      .from(columnTable)
      .leftJoin(columnExtTable, eq(columnExtTable.columnId, columnTable.id))
      .where(eq(columnTable.projectId, projectId))
      .orderBy(asc(columnTable.position));
    if (
      columns.some(
        ({ column, category }) =>
          (category ?? defaultCategory(column.slug, column.isFinal)) ===
          "canceled",
      )
    )
      return null;
    let slug = "canceled";
    for (
      let suffix = 2;
      columns.some(({ column }) => column.slug === slug);
      suffix++
    )
      slug = `canceled-${suffix}`;
    const [column] = await tx
      .insert(columnTable)
      .values({
        projectId,
        name: "Canceled",
        slug,
        isFinal: true,
        position:
          Math.max(0, ...columns.map(({ column }) => column.position)) + 1,
      })
      .returning();
    if (!column)
      throw new HTTPException(500, {
        message: "Failed to create canceled column",
      });
    await tx
      .insert(columnExtTable)
      .values({ columnId: column.id, category: "canceled" });
    return column;
  });
  if (createdColumn) await publishEvent("project.updated", { projectId });
  await publishEvent("parity.workspace_updated", {
    type: "TRIAGE_UPDATED",
    workspaceId,
    projectId,
  });
  return getTriageSettings(projectId, workspaceId);
}
