# Tracing branding and compatibility

Tracing is the Go Figure fork of Kaneo. The app, outgoing email, native app display name, repository, workspace packages, MCP server, CLI and deployment artifacts use Tracing.

The public address is `tracing.gofigureapp.io`; the former `kaneo.gofigureapp.io` address remains available during migration. Production SMTP uses `Tracing <tracing@gofigureapp.io>`.

Some identifiers are deliberately retained to preserve existing installations:

- Database table names, migrations, source-import provider IDs, stored editor attributes, storage prefixes, cookies and request headers.
- Existing local mobile preferences and sessions, and the `kaneo://` native URL scheme alongside `tracing://`.
- Supported `KANEO_*` environment variables as fallback aliases for the new `TRACING_*` names.
- Original license notices, historical changelogs, archived upstream workflows and upstream service policies. Those policies describe the upstream service and are not Tracing’s hosted terms.

The Tracing CLI and stdio MCP package are built from this repository. Renaming their workspace packages does not publish them or transfer ownership of upstream package registries, Homebrew taps, app-store listings, or container registries.
