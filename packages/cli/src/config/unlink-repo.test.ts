import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { expect, it } from "vite-plus/test";
import { findRepoConfig, linkFilePath } from "./repo-config.js";
import { clearRepoLinks, readRepoLinks } from "./unlink-repo.js";

it("unlinks both names without reactivating the legacy link or removing unrelated keys", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tracing-unlink-"));
  try {
    await writeFile(
      join(directory, ".tracing.json"),
      JSON.stringify({ workspace: "new", project: "NEW" }),
    );
    await writeFile(
      join(directory, ".kaneo.json"),
      JSON.stringify({ workspace: "old", project: "OLD", theme: "dark" }),
    );
    const files = await Effect.runPromise(
      readRepoLinks(linkFilePath(directory)),
    );
    await Effect.runPromise(clearRepoLinks(files));
    expect(findRepoConfig(directory)?.workspace).toBeUndefined();
    expect(findRepoConfig(directory)?.project).toBeUndefined();
    expect(
      JSON.parse(await readFile(join(directory, ".kaneo.json"), "utf8")),
    ).toEqual({ theme: "dark" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("keeps the active link if legacy cleanup fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tracing-unlink-failure-"));
  try {
    const preferred = join(directory, ".tracing.json");
    const legacy = join(directory, ".kaneo.json");
    await writeFile(
      preferred,
      JSON.stringify({ workspace: "new", project: "NEW" }),
    );
    await writeFile(
      legacy,
      JSON.stringify({ workspace: "old", project: "OLD", theme: "dark" }),
    );
    const files = await Effect.runPromise(readRepoLinks(preferred));
    // A directory at the legacy path reliably causes its write to fail, even
    // when the test runs as root and file permission bits would be ignored.
    await rm(legacy);
    await mkdir(legacy);
    await expect(Effect.runPromise(clearRepoLinks(files))).rejects.toThrow();
    expect(JSON.parse(await readFile(preferred, "utf8"))).toEqual({
      workspace: "new",
      project: "NEW",
    });
    expect(findRepoConfig(directory)?.workspace).toBe("new");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
