---
name: tracing-cli
description: Work with Tracing tasks, projects, comments and time tracking through the `tracing` CLI. Use when the user asks to list, create, update, assign or close Tracing tasks, see what is assigned to them, comment, log time, or script against a Tracing workspace on Tracing Cloud or a self-hosted instance.
---

# Tracing CLI

`tracing` is the official command line for [Tracing](https://tracing.gofigureapp.io). Run from an agent, stdout is not a terminal, so every command answers in JSON and never prompts.

## Check the setup first

Run `tracing context`. It prints the server, user, workspace and project in use, and where each value came from.

- `tracing: command not found`: build this repository with `pnpm --filter @tracing/cli build`, then run `node packages/cli/dist/tracing.mjs`. The renamed package is not published to npm or Homebrew.
- No user: `tracing login` is a browser approval only a person can finish. Ask the user to run it in their own terminal. Headless and CI runs use an API key in `KANEO_API_KEY` instead (created in Tracing under Settings, Account, API Keys).
- No workspace: list them with `tracing workspace list --jq '.[] | "\(.id) \(.name)"'` and pass `-w <id>`, or ask the user to pick a default with `tracing workspace use`.
- Server or compatibility errors: `tracing doctor` explains what is wrong.

You are ready when `tracing context` shows a user and the workspace you mean to act in.

## Output contract

- Success prints exactly one JSON value on stdout and exits 0.
- Failure prints `{"error": "message"}` on stdout and exits 1. The message names what went wrong, such as a missing project, so fix that and retry. A message saying something needs confirmation means rerunning with `--yes` once the user has agreed.
- `--jq '<expr>'` filters the JSON with a built-in jq. Strings print raw, one result per line. Reach for it to keep large results small.
- Writes print JSON describing the change: `task create` returns the new task (`--jq .ticketId` gives its ticket id), and `task status` returns the `from` and `to` columns. Run `tracing task view` to see the full task afterwards.
- `task list` stops at 50 tasks. Pass `--all` when you need every match, for example to count.
- `task mine` returns at most 100 tasks per workspace, soonest due first, and cannot page further. For a complete list, run `tracing task list -p <KEY> --mine --all` for each project.

## Addressing things

- Tasks by ticket id such as `KAN-12`, projects by key such as `KAN`, workspaces by id. When the user names a project, find its key with `tracing project list`.
- Statuses are the slugs of a project's columns, such as `to-do`, `in-progress` or `done`. Projects can have custom columns, so list them with `tracing column list -p KAN` before moving a task somewhere unfamiliar.
- The workspace comes from `-w`, then `KANEO_WORKSPACE`, then a `.tracing.json` in the current folder or any parent, then the default from `tracing workspace use`. The project comes from `-p`, then `KANEO_PROJECT`, then `.tracing.json`. A `.tracing.json` further up the tree can select a different workspace than expected; `tracing context` shows which source won.
- Dates take `YYYY-MM-DD`, `today`, `tomorrow` or `+3d`.
- `tracing task repeat` matches weekdays and month ends in the time zone of the machine it runs on. When that may not be the user's, such as in CI or on a remote host, pass their zone with `--time-zone`. `--stop` ends a series.
- Descriptions and comments are Markdown. Pass long text with `-F <file>`, or `-F -` to read stdin.

## Common commands

```sh
tracing project list --jq '.[] | "\(.key)  \(.name)"'
tracing column list -p KAN --jq '.[] | "\(.slug)  \(.name)"'
tracing task mine --jq '.[] | "\(.ticketId)  \(.statusName)  \(.title)"'
tracing task list -p KAN --open --jq '.[] | select(.priority == "urgent") | .ticketId'
tracing task view KAN-12
tracing task create "Fix flaky login test" -p KAN --priority high --due tomorrow --label Bug --assignee me
tracing task status KAN-12 in-progress
tracing task edit KAN-12 --priority urgent --add-label Bug
tracing task assign KAN-12 me
tracing task repeat KAN-12 weekly --on mon,thu --time-zone Europe/Madrid
tracing comment add KAN-12 "Fixed in #123"
tracing time log KAN-12 1h30m -m "Pairing on the fix"
tracing search "login redirect" --type tasks
tracing task delete KAN-12 --yes
tracing api GET /workspace --jq '.[].name'
```

Every command documents its arguments and flags in `tracing <command> --help`. The full reference is at https://github.com/Go-Figure-App/tracing/tree/main/apps/docs/core/integrations/cli-commands.

## Changes other people see

A workspace is shared and updates reach teammates live. Confirm with the user before deleting anything, applying `tracing task bulk`, or moving tasks between projects, then pass `--yes` where the command asks for confirmation. Keep credentials private: leave `KANEO_API_KEY`, `--token` values and the config file (`~/.config/tracing/config.json`) out of output and messages.
