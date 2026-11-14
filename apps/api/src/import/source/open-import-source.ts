import {
  connectSource,
  type ImportSource,
  type ImportSourceId,
} from "@kaneo/importers";
import { HTTPException } from "hono/http-exception";
import { createGuardedFetch } from "../guarded-fetch";
import type { ImportConnectionInput } from "../schema";
import {
  type DescribedImportError,
  describeImportError,
} from "./describe-import-error";
import { resolveImportConnection } from "./resolve-import-connection";
import { IMPORT_SOURCE_NAMES } from "./source-names";
import { enabledFeatures } from "../../parity/foundation/features";
import { connectPlanningLinear } from "../../parity/import/connect";

export type OpenedImportSource = {
  sourceId: ImportSourceId;
  sourceName: string;
  source: ImportSource;
  describe(error: unknown): DescribedImportError;
  resetFailure(): void;
  writeProject?: Awaited<
    ReturnType<typeof connectPlanningLinear>
  >["writeProject"];
  finish?: Awaited<ReturnType<typeof connectPlanningLinear>>["finish"];
};

export function importHttpError({ status, message }: DescribedImportError) {
  return new HTTPException(status, { message });
}

export async function openImportSource(
  input: ImportConnectionInput,
  signal: AbortSignal,
): Promise<OpenedImportSource> {
  const resolved = resolveImportConnection(input);
  const sourceName = IMPORT_SOURCE_NAMES[input.source];
  const guard = createGuardedFetch(sourceName, { cancelSignal: signal });
  const describe = (error: unknown) =>
    describeImportError(error, {
      sourceName,
      credentialHint: resolved.credentialHint,
      failure: guard.failure(),
      lastHost: guard.lastHost(),
      secrets: resolved.secrets,
    });

  try {
    const options = {
      fetch: guard.fetch,
      signal,
    };
    const planning =
      resolved.connection.source === "linear" &&
      enabledFeatures().includes("import")
        ? await connectPlanningLinear({
            ...options,
            apiKey: resolved.connection.apiKey,
          })
        : undefined;
    const source =
      planning?.source ?? (await connectSource(resolved.connection, options));
    return {
      sourceId: input.source,
      sourceName,
      source,
      describe,
      resetFailure: guard.reset,
      ...(planning
        ? { writeProject: planning.writeProject, finish: planning.finish }
        : {}),
    };
  } catch (error) {
    throw importHttpError(describe(error));
  }
}
