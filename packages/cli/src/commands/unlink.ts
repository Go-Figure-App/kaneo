import { basename, dirname } from "node:path";
import { Effect } from "effect";
import { Command, Flag } from "effect/cli";
import { linkFilePath, removeRepoLink } from "../config/repo-config.js";
import { readRepoLinks, clearRepoLinks } from "../config/unlink-repo.js";
import { Cancelled } from "../errors/errors.js";
import { emit } from "../output/emit.js";
import { Output } from "../output/output.js";
import { confirm } from "../prompts/confirm.js";
import type { Ui } from "../render/ui.js";
import { CliEnvironment } from "../services/cli-environment.js";
import { ApiLayer } from "./api-layer.js";

type UnlinkResult = {
  readonly path: string | null;
  readonly unlinked: boolean;
  readonly deleted: boolean;
};

export function renderUnlink(ui: Ui, result: UnlinkResult): string[] {
  const { theme, glyphs } = ui;
  if (!result.path || !result.unlinked) {
    return [
      `  ${theme.muted(glyphs.dot)} This directory is not linked to Tracing`,
    ];
  }
  const detail = result.deleted
    ? `removed ${basename(result.path)}`
    : `kept the other keys in ${basename(result.path)}`;
  return [
    `  ${theme.success(glyphs.tick)} Unlinked ${dirname(result.path)} ${theme.muted(`${glyphs.separator} ${detail}`)}`,
  ];
}

export const runUnlink = Effect.fn("command.unlink")(function* (options: {
  readonly yes: boolean;
}) {
  const environment = yield* CliEnvironment;
  const output = yield* Output;
  const path = linkFilePath(environment.cwd);
  const files = yield* readRepoLinks(path);

  if (files.length === 0) {
    yield* emit<UnlinkResult>(
      { path: path ?? null, unlinked: false, deleted: false },
      renderUnlink,
    );
    return;
  }

  if (!options.yes && output.interactive) {
    const confirmed = yield* confirm(
      `Remove the Tracing workspace and project from ${files.map((file) => file.path).join(" and ")}?`,
    );
    if (!confirmed) return yield* new Cancelled();
  }

  const first = files[0]!;
  const remaining = removeRepoLink(first.value);
  yield* clearRepoLinks(files);

  yield* emit<UnlinkResult>(
    { path: first.path, unlinked: true, deleted: remaining === undefined },
    renderUnlink,
  );
});

export const unlinkCommand = Command.make(
  "unlink",
  {
    yes: Flag.Boolean("yes").pipe(
      Flag.withAlias("y"),
      Flag.withDescription("Unlink without asking for confirmation"),
      Flag.withDefault(false),
    ),
  },
  (options) => runUnlink(options),
).pipe(
  Command.withDescription(
    "Remove this repository's Tracing and legacy Kaneo links",
  ),
  Command.provide(ApiLayer),
);
