import { basename, dirname, join } from "node:path";
import { Effect } from "effect";
import {
  deleteRepoConfig,
  hasRepoLink,
  readRepoConfigObject,
  removeRepoLink,
  type RepoConfigObject,
  writeRepoConfig,
} from "./repo-config.js";

type LinkedFile = { readonly path: string; readonly value: RepoConfigObject };

// Read and validate both files before changing either. Otherwise removing the
// preferred file can reactivate a legacy link in the same directory. Clear the
// legacy file first so a failed write leaves the active link unchanged.
export const readRepoLinks = Effect.fnUntraced(function* (path: string) {
  const paths =
    basename(path) === ".tracing.json"
      ? [join(dirname(path), ".kaneo.json"), path]
      : [path];
  const linked: LinkedFile[] = [];
  for (const candidate of paths) {
    const value = yield* readRepoConfigObject(candidate);
    if (value && hasRepoLink(value)) linked.push({ path: candidate, value });
  }
  return linked;
});

export const clearRepoLinks = Effect.fnUntraced(function* (
  files: readonly LinkedFile[],
) {
  for (const file of files) {
    const remaining = removeRepoLink(file.value);
    if (remaining) yield* writeRepoConfig(file.path, remaining);
    else yield* deleteRepoConfig(file.path);
  }
});
