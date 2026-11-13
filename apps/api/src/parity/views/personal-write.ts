import type { Context, Next } from "hono";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";
// Members may organize their own views and favorites even with a read-only
// workspace role. A read-only API key must not mutate those personal settings.
export async function requirePersonalViewWrite(c: Context, next: Next) {
  if (c.get("apiKey"))
    return requireWorkspacePermission({ project: ["update"] })(c, next);
  return next();
}
