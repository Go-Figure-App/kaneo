# Tracing Mobile

The Tracing app for Android and iOS, built with Expo and React Native. This Go Figure build connects to the team’s Tracing instance at `tracing.gofigureapp.io`.

## Features

- **Sign in** with email and password, a one-time email code, an API key, or **Continue in browser** (device authorization). The browser flow covers GitHub, Google, Discord, OIDC/SSO and anything else the server supports.
- **Workspaces**: switch, create, rename, describe, leave, delete.
- **Members**: list, invite with a role, resend or cancel invitations, change roles, remove. Accept or decline your own invitations.
- **Projects**: list with progress, create, rename, change the key, make public, archive or restore, move to another workspace, delete.
- **Boards**: swipe between columns, or use the list view. Show the backlog and archived tasks. Filter by text, assignee, priority, label or overdue. Long-press a card to move it, change its priority or assignee, or send it to the top or bottom of its column.
- **Columns**: add, rename, reorder, mark as done, delete.
- **Tasks**: create with every field (including custom fields), edit the title, Markdown description (with preview and image upload), status, priority, assignee, start and due dates, and labels (you can create labels inline). Duplicate, move to another project, share, copy the link, delete.
- **Subtasks and relations**: add subtasks, check them off, set or change the parent task, link related or blocking tasks.
- **Links**: attach URLs; synced integration links are shown read-only.
- **Custom fields**: text, number, date, checkbox, dropdown, multi-select. Define them in project settings.
- **Time tracking**: start/stop a timer, log time manually, edit your entries.
- **Comments and activity**: Markdown comments with @mentions and image attachments; edit and delete your own comments; full activity timeline.
- **My tasks**, **Inbox** (notifications: mark read, mark all read, clear) and the **workspace activity** feed.
- **Search** across tasks, projects and comments.
- **Account**: name, profile photo, password, notification delivery settings (email, ntfy, Gotify, webhook, event types, due-date reminders).
- **Live updates** over Tracing's WebSockets while the app is open, and **phone notifications** from a background check (Tracing has no mobile push service). Android runs the check about every 15 minutes; iOS decides when to run it, so it can be less frequent.

### Left out on purpose

These are admin or desktop tasks that don't fit a phone: integration setup (GitHub, GitLab, Gitea, Slack, Discord, Telegram, Mattermost, webhooks) and sync rules, workflow rules, task import/export, calendar feeds, instance administration, custom role editing, per-member project access, billing, API key management, MCP, project icons and backgrounds, and Gantt/calendar views. They are still available on the web.

## Connecting

This build uses the configured Go Figure server. Sign in with your existing account, an email code, an API key, or **Continue in browser**. There is no in-app purchase.

_Continue in browser_ uses `tracing-mobile`. Upgrade older servers or add it to `DEVICE_AUTH_CLIENT_IDS` before distributing the app, retaining every client ID still in use. See [server upgrade guidance](../docs/core/operations/upgrades.mdx#mobile-device-sign-in-compatibility).

Credentials are stored with `expo-secure-store`: in the iOS Keychain, and encrypted with a key held in the Android Keystore.

## Development

Install dependencies from the repository root with `pnpm install`. The app uses native modules, so run it as a development build rather than in Expo Go:

```bash
pnpm --filter @tracing/mobile android   # needs JDK 17 and the Android SDK
pnpm --filter @tracing/mobile ios       # needs macOS, Xcode and CocoaPods
pnpm --filter @tracing/mobile start     # Metro only, for an already installed development build
```

The `ios/` and `android/` folders are generated from `app.json` and the config plugins in `plugins/` (continuous native generation) and are not committed. Change native settings there, then regenerate with `pnpm --filter @tracing/mobile exec expo prebuild --clean`.

Checks:

```bash
pnpm --filter @tracing/mobile lint
pnpm --filter @tracing/mobile typecheck
pnpm --filter @tracing/mobile test
```

## TestFlight builds

The Expo project is [@gofigure/tracing](https://expo.dev/accounts/gofigure/projects/tracing), with bundle ID `io.gofigureapp.tracing`. The `production` EAS profile creates an App Store-signed build and increments its build number remotely. The Apple Developer team must have a matching bundle ID, distribution certificate, provisioning profile and App Store Connect app record.

Run from `apps/mobile` after the source revision has passed CI:

```bash
npx eas-cli@27.10.0 build --platform ios --profile production
npx eas-cli@27.10.0 submit --platform ios --profile production
```

Select the completed build from this project during submission. After Apple finishes processing it, add it to an internal TestFlight group. Uploading a TestFlight build does not release the app publicly on the App Store. Keep signing credentials in EAS or local secret storage, never in Git.

Do not set `GOFIGURE_LOCAL_SERVER_URL` for distribution builds. It is only for local simulator testing. Forks can select their own Expo account and project by setting both `GOFIGURE_EXPO_OWNER` and `GOFIGURE_EAS_PROJECT_ID`.

## Local Android release builds

The inherited Android APK workflow is archived. To create an APK locally, configure `KANEO_ANDROID_KEYSTORE`, `KANEO_ANDROID_KEYSTORE_PASSWORD`, `KANEO_ANDROID_KEY_ALIAS` and `KANEO_ANDROID_KEY_PASSWORD`, then run `pnpm --filter @tracing/mobile exec expo run:android --variant release`. The legacy variable names are retained for signing compatibility. If no release key is set, the plugin uses a debug key. Keep a stable release key and increase `android.versionCode` for installable upgrades.

## Project layout

```
src/app/         Expo Router screens; every file is a route
src/components/  shared UI (sheets, pickers, Markdown, avatars, toasts)
src/features/    screen-specific pieces for the home tabs, board and task
src/lib/         API client and types, auth, session storage, realtime, background notifications
src/theme/       Tracing design tokens, light and dark
plugins/         local Expo config plugins
```
