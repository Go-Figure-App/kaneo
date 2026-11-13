# Go Figure planning fork

Phase 0 implements the foundation from the technical design attached to [GOF-272](https://linear.app/gofigure/issue/GOF-272). Later phases require a separate branch, pull request and review. The fork remote is `Go-Figure-App/kaneo`; never open parity pull requests against `usekaneo/kaneo`.

## Boundaries

- API logic: `apps/api/src/parity/<feature>/`.
- Web components: `apps/web/src/components/parity/<feature>/`; typed fetchers under `fetchers/parity/`.
- Mobile logic: `apps/mobile/src/features/parity/<feature>/`.
- Tables: `apps/api/src/database/schema-parity.ts`. Do not edit upstream `schema.ts` or `apps/api/drizzle/`.
- Migrations: `apps/api/drizzle-parity/`, tracked in `drizzle.__drizzle_parity_migrations`. Startup runs these after upstream migrations, even when features are disabled. Initial foreign keys are inline in new table declarations; no upstream table is altered.
- React to mutations through the existing event bus. Do not modify task controllers.
- Reuse existing permissions. Project data and event recipients must respect project access restrictions. Socket messages carry only a type and workspace ID; clients refetch authorized endpoints and discard parity caches on access changes.
- Target fewer than 20 shared integration edits. Record generated locale synchronization separately and count it in the total; upstream's required locale check needs every catalog to contain the source keys. Ask before a large change to a shared file or a design/model change.
- No Railway changes, production migration/import, paid services, TestFlight or App Store submission without explicit permission. The maintainer authorized review fixes, merging approved green PRs, and continuing to the next phase; deployment remains separate.

## Phase 0 spike findings

Validated against upstream `cb70ff64` (v2.49.0), with the existing Go Figure mobile identity commit `104f1f6f` preserved.

1. **Separate migrations work.** A disposable PostgreSQL database applied 74 upstream migrations followed by an independent migration through `prepareDatabaseStartup`. Concurrent and repeated startup do not reapply either set. A dedicated PostgreSQL session holds an advisory lock before reading the parity ledger and releases it on success or failure. The integration test checks that upstream columns and its migration ledger remain identical and that the previous migration sequence still runs.
2. **Task properties support small insertions.** `components/task/properties/properties-rail.tsx` already composes `PropertyRow`; `property-chips.tsx` handles compact layouts. Later phases can mount parity components in those two places, just like custom fields. No task-panel changes are needed in Phase 0.
3. **The importer cannot transparently carry planning metadata.** `packages/importers/src/linear/source.ts` lists Linear teams, not Linear projects, and `ImportedProject`/`ImportedTask` have no planning metadata. `writeProjectContent` constructs its source-to-destination task map internally and returns counts, not that map. Phase 7 needs a parity source/writer path or an explicit hook exposing that mapping. No shared importer types were changed in this phase.

Other design/code differences: startup must seed categories after upstream `migrateColumns`; existing tasks have a real `column_id` as well as a status slug; activity for a project move uses type `moved`. Kaneo's final flag still drives upstream automations, while parity categories drive planning. The deployment has one bundled Kaneo service plus Postgres, rather than the three services assumed by the design. Railway was inspected read-only.

## Configuration and behavior

`PARITY_FEATURES` is a comma-separated allowlist: `foundation,triage,projects,initiatives,roadmap,cycles,insights,views,import`. It defaults to empty. Any recognized feature implies `foundation`; unknown names have no effect. Only foundation functionality is implemented in Phase 0. Restart the API after changing configuration.

With `PARITY_FEATURES=foundation`, project Workflow settings show state categories, and lifecycle subscribers are enabled. New columns without side rows use deterministic defaults; startup seeds existing columns without overriding manual choices. A canceled/declined/duplicate slug maps to canceled, final columns to completed, backlog/triage to backlog, in-progress/in-review/started/doing to started, and other columns to unstarted. Categories can be reversed in settings without modifying upstream final flags.

Endpoints (all require authentication):

- `GET /api/parity/features`: enabled instance capabilities; no workspace data.
- `GET /api/parity/columns/{projectId}`: readable project's workflow categories.
- `PUT /api/parity/columns/{projectId}/{columnId}`: set a category with existing `project:update` permission; rejects columns from another project.

Lifecycle semantics: retain the first observed start, retain a terminal timestamp while the task stays in that category, clear terminal timestamps on reopening, and record a new timestamp on recompletion. Live subscribers capture the triggering transition before awaiting database work, replay recorded status/move history, and lock current task rows. The captured source status distinguishes entry into a terminal category from a move between two states in the same category. This preserves rapid transitions even when handlers run late or out of order, while the current category clears stale terminal dates. Reconciliation chooses the earliest known start and the latest applicable terminal transition. Category changes reconcile history for that project. The existing event bus is asynchronous and not a durable queue; the backfill is also a reconciliation tool.

The four side tables contain the design's fields. Missing task/project/workspace rows mean defaults. Cycle and milestone IDs are nullable reserved text fields; their target tables and assignment validation arrive in their own phases. No Phase 0 endpoint writes them.

### Historical backfill

After starting the API against a **local database or approved copy**, run from `apps/api`:

```sh
DATABASE_URL=postgresql://kaneo@127.0.0.1:55432/kaneo_parity_test pnpm exec tsx src/parity/foundation/backfill.ts
```

This script pages tasks, reads `status_changed`/`moved` activity in chronological order, preserves unrelated extension fields and live observations, and can be rerun. Tasks without usable history retain null historical timestamps. Move records reconstruct the project active at each historical transition, so identical slugs in different projects use their own categories. Activity does not preserve historical category configuration: deleted/renamed columns, missing move records, or later category redefinitions cannot be reconstructed exactly. No dates are synthesized for missing history. The script does not migrate the database.

Generate future parity migrations from `apps/api` with `pnpm exec drizzle-kit generate --config drizzle-parity.config.ts`; inspect SQL before use. Keep SQL additive and ensure both migration folders are included in both API Docker images.

### Mobile

The existing fork config retains name `GF Kaneo` and bundle/package ID `io.gofigureapp.kaneo`. The build fixes its server to `https://kaneo.gofigureapp.io`, hides server selection and removes the purchase screen, purchase module and `react-native-purchases`. Stored credentials for a different server are cleared on hydration; they cannot be saved by this build.

For local simulator testing only, `GOFIGURE_LOCAL_SERVER_URL=http://localhost:18173` overrides the fixed address at build/Metro startup. Do not set that override for distribution builds. The existing device-login URL scheme remains `kaneo://` to match the server's approval page. Expo SDK 58 [app configuration](https://docs.expo.dev/versions/v58.0.0/config/app/) and [Constants](https://docs.expo.dev/versions/v58.0.0/sdk/constants/) docs were checked. Native builds must be rebuilt after removing the purchases library.

## Shared-file register (70 files: 19 integration/config files, 20 catalogs, 28 workflow moves, 3 fixture paths)

| File | Change and reason |
| --- | --- |
| `AGENTS.md` | Replace the external-contributor marker instruction with this guide. |
| `apps/api/src/index.ts` | Mount/type parity routes; run separate migrations and initialize subscribers after upstream startup. |
| `apps/api/src/database/index.ts` | Register side tables in the existing database client. |
| `apps/api/Dockerfile` | Copy parity migrations into the standalone API image. |
| `Dockerfile.kaneo` | Copy parity migrations into the bundled image. |
| `apps/docs/openapi.json` | Generated contract for the three foundation routes. |
| `apps/web/src/routes/_layout/_authenticated/dashboard/settings/projects/$projectId/workflow.tsx` | Mount the parity category component. |
| `apps/web/src/hooks/use-user-websocket.ts` | Forward hints and access changes to parity cache handling. |
| `i18n/en-US.json` | Source copy for category settings and the fixed-server mobile sign-in. The 20 other catalogs contain translations of the new strings. |
| `apps/mobile/app.config.js` | Add the fixed server URL to the existing fork-owned config. |
| `apps/mobile/package.json` | Remove the purchases native dependency. |
| `pnpm-lock.yaml` | Remove purchases and its unused transitive packages. |
| `apps/mobile/src/app/sign-in.tsx` | Probe the fixed server, hide server switching, remove unlock flow. |
| `apps/mobile/src/features/sign-in/self-hosted-unlock.tsx` | Delete the purchase screen. |
| `apps/mobile/src/lib/purchases.ts` | Delete the unused purchase client. |
| `apps/mobile/src/lib/session.ts` | Enforce the build's server for persisted credentials. |
| `apps/mobile/src/app/(app)/index.tsx` | Forward workspace hints and access changes to parity cache handling. |
| `.coderabbit.yaml` | Enable automatic reviews and the review approval workflow for this fork. |
| `apps/mobile/src/lib/api/client.ts` | Re-export the pure parity URL normalizer so connection and persisted sessions use the same canonical address without a circular import. |

The following 20 existing catalogs each receive translations for the 11 new source strings (17 added lines per file). Key synchronization began with `pnpm i18n:check:fix`; review then added locale-specific translations. Upstream CI requires locale key parity; no pre-existing translation is replaced. The source remains `i18n/en-US.json`.

| Generated catalog | Change and reason |
| --- | --- |
| `i18n/az-AZ.json` | Translate the new category and sign-in strings. |
| `i18n/de-DE.json` | Translate the new category and sign-in strings. |
| `i18n/el-GR.json` | Translate the new category and sign-in strings. |
| `i18n/es-ES.json` | Translate the new category and sign-in strings. |
| `i18n/fr-FR.json` | Translate the new category and sign-in strings. |
| `i18n/hi-IN.json` | Translate the new category and sign-in strings. |
| `i18n/id-ID.json` | Translate the new category and sign-in strings. |
| `i18n/it-IT.json` | Translate the new category and sign-in strings. |
| `i18n/ja-JP.json` | Translate the new category and sign-in strings. |
| `i18n/ko-KR.json` | Translate the new category and sign-in strings. |
| `i18n/mk-MK.json` | Translate the new category and sign-in strings. |
| `i18n/nl-NL.json` | Translate the new category and sign-in strings. |
| `i18n/pl-PL.json` | Translate the new category and sign-in strings. |
| `i18n/pt-BR.json` | Translate the new category and sign-in strings. |
| `i18n/ru-RU.json` | Translate the new category and sign-in strings. |
| `i18n/tr-TR.json` | Translate the new category and sign-in strings. |
| `i18n/uk-UA.json` | Translate the new category and sign-in strings. |
| `i18n/vi-VN.json` | Translate the new category and sign-in strings. |
| `i18n/zh-CN.json` | Translate the new category and sign-in strings. |
| `i18n/zh-TW.json` | Translate the new category and sign-in strings. |

The maintainer explicitly authorized retiring irrelevant CI/CD. These additional infrastructure edits exceed the original shared-file target and keep upstream automation from running or publishing on the fork. Workflow contents are preserved unchanged in `.github/upstream-workflows/` for reference; GitHub only discovers `.github/workflows/`. The archived workflows are not runnable from their new location.

| Upstream file | Change and reason |
| --- | --- |
| `.github/workflows/agentscan.yml` | Move unchanged to `.github/upstream-workflows/agentscan.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/android.yml` | Move unchanged to `.github/upstream-workflows/android.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/auto-assign.yml` | Move unchanged to `.github/upstream-workflows/auto-assign.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/browserstack.yml` | Move unchanged to `.github/upstream-workflows/browserstack.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/build-images.yml` | Move unchanged to `.github/upstream-workflows/build-images.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/ci.yml` | Move unchanged to `.github/upstream-workflows/ci.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/code-review.yml` | Move unchanged to `.github/upstream-workflows/code-review.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/contribution-eligibility.yml` | Move unchanged to `.github/upstream-workflows/contribution-eligibility.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/dependency-graph.yml` | Move unchanged to `.github/upstream-workflows/dependency-graph.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/deploy-site.yml` | Move unchanged to `.github/upstream-workflows/deploy-site.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/docker.yml` | Move unchanged to `.github/upstream-workflows/docker.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/helm-chart.yml` | Move unchanged to `.github/upstream-workflows/helm-chart.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/helm-validate.yml` | Move unchanged to `.github/upstream-workflows/helm-validate.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/issue-notify.yml` | Move unchanged to `.github/upstream-workflows/issue-notify.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/issue-priority.yml` | Move unchanged to `.github/upstream-workflows/issue-priority.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/mellon.yml` | Move unchanged to `.github/upstream-workflows/mellon.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/nightly.yml` | Move unchanged to `.github/upstream-workflows/nightly.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/pr-size-labeler.yml` | Move unchanged to `.github/upstream-workflows/pr-size-labeler.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/pr-title.yml` | Move unchanged to `.github/upstream-workflows/pr-title.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/publish-cli.yml` | Move unchanged to `.github/upstream-workflows/publish-cli.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/publish-mcp.yml` | Move unchanged to `.github/upstream-workflows/publish-mcp.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/publish-planka-import.yml` | Move unchanged to `.github/upstream-workflows/publish-planka-import.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/release-notify.yml` | Move unchanged to `.github/upstream-workflows/release-notify.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/release.yml` | Move unchanged to `.github/upstream-workflows/release.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/slop-labeler.yml` | Move unchanged to `.github/upstream-workflows/slop-labeler.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/ui-review-run.yml` | Move unchanged to `.github/upstream-workflows/ui-review-run.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/ui-review.yml` | Move unchanged to `.github/upstream-workflows/ui-review.yml`; replaced by fork CI or unrelated upstream automation. |
| `.github/workflows/update-contributors.yml` | Move unchanged to `.github/upstream-workflows/update-contributors.yml`; replaced by fork CI or unrelated upstream automation. |
| `scripts/security/release-inputs.test.mjs` | Read the archived build workflow fixture; retain all security assertions. |
| `scripts/ci/mcp-registry.test.mjs` | Read the archived publish workflow fixture; retain all registry assertions. |
| `scripts/security/workflows.test.mjs` | Read archived fixture commands and scan both workflow directories; retain all security assertions. |

## Fork CI and review

`.github/workflows/parity-ci.yml` runs on pull requests, pushes to `main` and manual dispatches in `Go-Figure-App/kaneo`. It uses standard GitHub-hosted Ubuntu runners, read-only repository permissions, pinned actions, and synthetic PostgreSQL data. Checks cover active-workflow validation with checksum-verified actionlint, lint, locale parity, OpenAPI, typecheck, all workspace unit suites, four integration shards, the bundled Docker build, upstream browser flows with parity disabled, and parity browser flows with it enabled. The final result requires every job to succeed; skipped or cancelled jobs fail the gate. Packages run serially inside the unit job to avoid import-time resource contention.

CI does not publish images, upload artifacts, deploy to Railway or submit mobile builds. The 28 inherited workflows have been removed from the active directory. The six that GitHub registered before this change were also disabled, and their queued runs were canceled. This prevents inherited Blacksmith, publishing, Pages, release, sponsor, labeling, and review jobs from activating after merge. CodeRabbit reviews are enabled, and maintainers can also request `@coderabbitai review`. Review findings and the latest commit's checks must be addressed before merging. Production deployment remains a separate approval step.

## Verification commands

Use the `packageManager` version in `package.json` (12.18.0 here; the setup document still says 12.15.0). The integration database name must end in `_test`, and its URL must include a nonempty test password for the file-secret fixture. Upstream's lease fixtures assume a UTC PostgreSQL session, matching its Docker environment.

```sh
pnpm lint
pnpm typecheck
pnpm test
DATABASE_URL=postgresql://kaneo:local-test-password@127.0.0.1:55432/kaneo_parity_test pnpm test:integration
pnpm openapi:check
```

The parity browser test uses its own config so the default upstream smoke suite continues to test a feature-disabled deployment. Start the disposable browser stack with both `tests/e2e/compose.yml` and `tests/e2e/compose.parity.yml`, then run:

```sh
pnpm --dir tests/e2e exec playwright test --config playwright.parity.config.ts
pnpm test:e2e
```

Do not loosen upstream tests. Diagnose failures and record environment limitations. Verify the new routes' success, permission denial and hidden-project cases; both migration sets on an upstream-shaped database; event-to-user-socket-to-cache behavior; and the iOS simulator before calling the phase complete.

For a local web preview outside Docker, explicitly set `VITE_API_URL`, `VITE_CLIENT_URL`, `VITE_TURNSTILE_SITE_KEY` and `VITE_SENTRY_DSN` when building. The checked-in production values are placeholders normally replaced by Docker's entrypoint. Empty CAPTCHA/Sentry values match the disposable test stack. Keep browser checks separate from resource-intensive workspace builds.

## Phase 0 verification (2026-11-12)

All checks used synthetic data and disposable PostgreSQL databases on this machine. No production migration, import, Railway change or distribution build was submitted.

| Check | Result |
| --- | --- |
| Root lint and formatting | Passed; no errors or warnings. |
| Root typecheck | All 22 tasks passed. |
| Workspace unit suites | 3,189 tests passed across package runs, plus 8 MCP protocol/input cases. The complete API suite passed separately: 209 files, 1,647 tests. |
| Full API integration suite | 200 files, 2,213 cases: 2,208 passed initially, 2 local setup failures resolved on rerun, 3 existing provider-conditional skips. No test was changed, skipped or relaxed to resolve a failure. |
| Final parity/lease integration rerun | All 186 cases passed, including all 8 new parity cases and the 178-case upstream lease file. |
| File-secret integration rerun | All 3 cases passed with a nonempty local test password in the URL. |
| OpenAPI check | Generated contract is up to date. |
| Web production build | Passed; existing large-chunk warnings remain. |
| Built-bundle Playwright | All 3 upstream flows passed, plus the parity workflow-category flow with a second browser page receiving the user-socket hint. |
| iOS native build and simulator | Built with 0 errors and 1 build warning. `GF Kaneo` on iPhone 17 / iOS 27 signed into the disposable server and displayed the test workspace/project. Server selection and the purchase screen were absent. |

Failures encountered and resolved without changing upstream assertions:

- The parallel root unit run hit `Test timed out in 5000ms` in `bounded-fetch.test.ts` and `mcp-internal-api-url.test.ts`. The full API suite passed when run alone with unchanged timeouts; all other package suites passed.
- The lease fixture reported `expected { degraded: false } to deeply equal {}` because PostgreSQL's local timezone was not UTC. With the disposable server set to UTC, its complete 178-case file passed.
- The file-secret fixture reported `POSTGRES_PASSWORD_FILE points to an empty file` because the initial local connection URL omitted a password. The fixture passed with a nonempty test password.
- Development-server browser runs encountered `net::ERR_ABORTED` and a detached button while navigating. The first production preview also retained Docker's placeholder CAPTCHA key and displayed `The security check didn't load`. Building with explicit local configuration and running against the built bundle produced four passing browser flows.

The first Go Figure CI run additionally passed the bundled Docker build, all four browser flows, quality/contracts, and all four API integration shards. Its unit job caught four existing web assertions affected by unconditional parity cache removal; the fix avoids touching caches when no parity queries exist and retains the upstream assertions.

Not verified: production data or deployment, Redis fan-out across replicas, physical-device/APNs behavior, OAuth/OTP mobile sign-in, TestFlight/App Store distribution or Android execution. Android identity configuration remains in place and shared mobile code passes typecheck; Android-specific testing is outside this phase's requested scope. Incomplete historical activity cannot recover exact old workflow categories; the backfill limitations above apply.

### Review regression checks (2026-11-13)

- All 22 typecheck tasks, root lint/formatting, and 21 locale catalogs passed.
- All 9 parity integration cases passed, including delayed/out-of-order transitions, concurrent migration startup and lock release after failure. The migration case passed again after the final lock-cleanup change.
- Workspace suites ran 5,151 cases: 5,147 passed initially and four existing editor cases hit local timing failures. Both affected files passed all 15 cases with two workers and unchanged assertions/timeouts. The 25 focused socket/cache cases passed, including the four regressions caught by the first CI run.
- All 176 security, workflow, release and contribution-script cases passed after installing their pinned disposable nginx image and relocating three fixture paths.
- All 28 archived workflow files are byte-for-byte copies of the inherited definitions. Existing translations are unchanged; all 20 non-English locales now translate the 11 new strings.
- Merge remains gated on approval and the latest commit's complete GitHub CI run.

### Additional lifecycle review fixes (2026-11-13)

The second review identified cross-project history interpretation and timestamp drift between two terminal states. Backfill now reconstructs project context backward through recorded moves, and both historical and live transitions carry their source category. A move within the same terminal category retains its entry date; reopening and recompletion record a new date even if the reopening activity is delayed.

All 11 parity integration cases passed, including three project moves with conflicting custom-state categories and terminal-state events delivered before activity insertion and in reverse order. All 1,649 API unit cases and all 22 workspace typecheck tasks passed. The previous commit's full CI run passed all eight checks; the updated commit must pass CI and review again before merge.

Phase 1 starts after this phase receives approval and its latest CI run is green, as authorized by the maintainer. No new product decision is required before triage work; the importer boundary must be settled before Phase 7.
