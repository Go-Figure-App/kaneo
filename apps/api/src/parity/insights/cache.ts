import type { Insights } from "./schema";

const cache = new Map<
  string,
  { workspaceId: string; expiresAt: number; value: Insights }
>();
let revision = 0;
export const insightsRevision = () => revision;
export function cachedInsights(key: string, now = Date.now()) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= now) {
    cache.delete(key);
    return undefined;
  }
  return structuredClone(entry.value);
}
export function cacheInsights(
  key: string,
  workspaceId: string,
  value: Insights,
  now = Date.now(),
) {
  for (const [id, entry] of cache) if (entry.expiresAt <= now) cache.delete(id);
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, {
    workspaceId,
    expiresAt: now + 60_000,
    value: structuredClone(value),
  });
}
export function invalidateInsights(workspaceId?: string) {
  revision++;
  if (!workspaceId) cache.clear();
  else
    for (const [key, entry] of cache)
      if (entry.workspaceId === workspaceId) cache.delete(key);
}
