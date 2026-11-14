# Tracing

Tracing is Go Figure’s open-source planning workspace, built on [Kaneo](https://github.com/usekaneo/kaneo). It combines issue tracking with Linear-style triage, project plans, initiatives, roadmaps, cycles, insights, and saved views.

- [Open Tracing](https://tracing.gofigureapp.io)
- [Development setup](ENVIRONMENT_SETUP.md)
- [Planning features and implementation notes](PARITY.md)
- [MCP connection](packages/mcp/README.md)
- [Command-line client](packages/cli/README.md)

The web app and API run together in `Dockerfile.tracing`. PostgreSQL stores the workspace; S3-compatible storage holds attachments. SMTP delivers sign-in codes and notifications. See [.env.sample](.env.sample) for configuration. The mobile app uses the same API.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

GitHub Actions checks formatting, translations, API contracts, types, unit tests, PostgreSQL integration tests, and Docker/browser workflows on pull requests. Railway hosts the production app.

The source-built packages use the `@tracing` workspace namespace. They are not published npm packages. The hosted MCP endpoint is `https://tracing.gofigureapp.io/api/mcp` and includes the planning tools.

Tracing retains compatibility identifiers where changing them would invalidate stored content or existing clients. New deployment configuration can use `TRACING_*` variables; supported `KANEO_*` variables remain fallback aliases. See [branding compatibility](BRANDING.md).

Tracing is licensed under the [MIT license](LICENSE). The original Kaneo copyright and license notices are retained. Please report fork issues in [Go-Figure-App/tracing](https://github.com/Go-Figure-App/tracing/issues).
