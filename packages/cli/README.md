# Tracing CLI

A terminal client for Tracing, built from this repository:

```sh
pnpm --filter @tracing/cli build
node packages/cli/dist/tracing.mjs --help
```

The CLI supports device sign-in, projects, tasks, labels, comments, attachments, and JSON output for scripts. Run a command with `--help` for its options. Set `TRACING_API_URL=https://tracing.gofigureapp.io` to target the hosted workspace. `TRACING_API_KEY` supports existing API-key credentials; keep it outside source control.

Repository settings use `.tracing.json`. Existing Kaneo settings and environment variables remain supported during the transition. The `@tracing/cli` workspace package and Tracing binaries have not been published to npm, GitHub Releases, or Homebrew; build from source until a release is available.

The original Kaneo MIT license is retained in [LICENSE](LICENSE).
