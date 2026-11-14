import { and, eq, exists, ilike, like } from "drizzle-orm";
import db from "../../database";
import { externalLinkTable, taskTable } from "../../database/schema";
import { enabledFeatures } from "../foundation/features";
import { escapeLikePattern } from "../../search/like-pattern";

export function originalIdentifierMatches(query: string) {
  if (!enabledFeatures().includes("import")) return undefined;
  return exists(
    db
      .select({ id: externalLinkTable.id })
      .from(externalLinkTable)
      .where(
        and(
          eq(externalLinkTable.taskId, taskTable.id),
          eq(externalLinkTable.resourceType, "issue"),
          like(externalLinkTable.url, "https://linear.app/%"),
          ilike(externalLinkTable.externalId, escapeLikePattern(query.trim())),
        ),
      ),
  );
}
