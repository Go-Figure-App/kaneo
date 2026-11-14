import { environmentSetting } from "./environment-setting.js";
import { Context, Effect, Layer, Option, Redacted } from "effect";
import {
  ApiUrlFlag,
  ProfileFlag,
  TokenFlag,
  WorkspaceFlag,
} from "../cli/global-flags.js";
import { ConfigStore } from "../config/config-store.js";
import {
  type ConfigFile,
  DEFAULT_PROFILE,
  emptyConfig,
  type Profile,
} from "../config/format.js";
import { findRepoConfig, type RepoConfig } from "../config/repo-config.js";
import type { ConfigUnreadable } from "../errors/errors.js";
import { normalizeBaseUrl } from "@tracing/mcp/normalize-base-url";
import type { Environment } from "../render/capabilities.js";
import { CliEnvironment } from "./cli-environment.js";

export const DEFAULT_API_URL = "https://tracing.gofigureapp.io";

export type TokenSource = "flag" | "env" | "profile";

export type Credentials = {
  readonly token: Redacted.Redacted<string>;
  readonly source: TokenSource;
  readonly variable?: string;
};

export type WorkspaceSource = "flag" | "env" | "repo" | "profile";

export type WorkspaceRef = {
  readonly id: string;
  readonly source: WorkspaceSource;
  readonly variable?: string;
};

export type ProjectRef = {
  readonly ref: string;
  readonly source: string;
};

export type SessionShape = {
  readonly apiUrl: string;
  readonly webUrl: string;
  readonly profileName: string;
  readonly config: ConfigFile;
  readonly configProblem: Option.Option<ConfigUnreadable>;
  readonly profile: Profile | undefined;
  readonly credentials: Option.Option<Credentials>;
  readonly workspace: Option.Option<WorkspaceRef>;
  readonly project: Option.Option<ProjectRef>;
  readonly repo: RepoConfig | undefined;
};

export class Session extends Context.Service<Session, SessionShape>()(
  "tracing/Session",
) {}

export type SessionInputs = {
  readonly flags: {
    readonly token: Option.Option<Redacted.Redacted<string>>;
    readonly apiUrl: Option.Option<string>;
    readonly workspace: Option.Option<string>;
    readonly profile: Option.Option<string>;
  };
  readonly env: Environment;
  readonly config: ConfigFile;
  readonly configProblem: Option.Option<ConfigUnreadable>;
  readonly repo: RepoConfig | undefined;
};

function nonEmpty(value: string | undefined): Option.Option<string> {
  return value && value.trim() !== ""
    ? Option.some(value.trim())
    : Option.none();
}

export function resolveSession(inputs: SessionInputs): SessionShape {
  const { flags, env, config, repo } = inputs;
  const profileName = Option.getOrElse(
    Option.orElse(flags.profile, () =>
      nonEmpty(environmentSetting(env, "PROFILE")?.value),
    ),
    () => config.activeProfile || DEFAULT_PROFILE,
  );
  const profile = config.profiles[profileName];
  const apiUrl = normalizeBaseUrl(
    Option.getOrElse(
      Option.orElse(flags.apiUrl, () =>
        nonEmpty(environmentSetting(env, "API_URL")?.value),
      ),
      () => profile?.apiUrl ?? DEFAULT_API_URL,
    ),
  );
  const profileMatches =
    profile !== undefined && normalizeBaseUrl(profile.apiUrl) === apiUrl;
  const webUrl = normalizeBaseUrl(
    environmentSetting(env, "WEB_URL")?.value ||
      (profileMatches ? profile.webUrl : undefined) ||
      apiUrl,
  );

  const credentials: Option.Option<Credentials> = Option.firstSomeOf([
    Option.map(flags.token, (token) => ({ token, source: "flag" as const })),
    Option.map(
      nonEmpty(environmentSetting(env, "API_KEY")?.value),
      (token) => ({
        token: Redacted.make(token),
        source: "env" as const,
        variable: environmentSetting(env, "API_KEY")?.name,
      }),
    ),
    profileMatches && profile.token
      ? Option.some({
          token: Redacted.make(profile.token),
          source: "profile" as const,
        })
      : Option.none(),
  ]);

  const workspace: Option.Option<WorkspaceRef> = Option.firstSomeOf([
    Option.map(flags.workspace, (id) => ({ id, source: "flag" as const })),
    Option.map(nonEmpty(environmentSetting(env, "WORKSPACE")?.value), (id) => ({
      id,
      source: "env" as const,
      variable: environmentSetting(env, "WORKSPACE")?.name,
    })),
    Option.map(Option.fromUndefinedOr(repo?.workspace), (id) => ({
      id,
      source: "repo" as const,
    })),
    profileMatches && profile.workspaceId
      ? Option.some({ id: profile.workspaceId, source: "profile" as const })
      : Option.none(),
  ]);

  const project: Option.Option<ProjectRef> = Option.firstSomeOf([
    Option.map(nonEmpty(environmentSetting(env, "PROJECT")?.value), (ref) => ({
      ref,
      source: environmentSetting(env, "PROJECT")!.name,
    })),
    Option.map(Option.fromUndefinedOr(repo?.project), (ref) => ({
      ref,
      source: repo?.path ?? ".tracing.json",
    })),
  ]);

  return {
    apiUrl,
    webUrl,
    profileName,
    config,
    configProblem: inputs.configProblem,
    profile: profileMatches ? profile : undefined,
    credentials,
    workspace,
    project,
    repo,
  };
}

export const SessionLive = Layer.effect(
  Session,
  Effect.gen(function* () {
    const environment = yield* CliEnvironment;
    const store = yield* ConfigStore;
    const loaded = yield* Effect.result(store.load);
    return resolveSession({
      flags: {
        token: yield* TokenFlag,
        apiUrl: yield* ApiUrlFlag,
        workspace: yield* WorkspaceFlag,
        profile: yield* ProfileFlag,
      },
      env: environment.env,
      config: loaded._tag === "Success" ? loaded.success : emptyConfig,
      configProblem:
        loaded._tag === "Failure" ? Option.some(loaded.failure) : Option.none(),
      repo: findRepoConfig(environment.cwd),
    });
  }),
);
