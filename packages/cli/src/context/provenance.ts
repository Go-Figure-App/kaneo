import { environmentSetting } from "../services/environment-setting.js";
import { normalizeBaseUrl } from "@tracing/mcp/normalize-base-url";
import { Option, Redacted } from "effect";
import { resolveSession, type SessionInputs } from "../services/session.js";

export type ServerSource = "flag" | "env" | "profile" | "default";
export type WebSource = "env" | "profile" | "server";
export type ProfileSource = "flag" | "env" | "config" | "default";
export type AuthSource = "flag" | "env" | "profile" | "none";
export type WorkspaceSource = "flag" | "env" | "repo" | "profile" | "none";
export type ProjectSource = "env" | "repo" | "none";

export type Provenance = {
  readonly server: {
    readonly url: string;
    readonly source: ServerSource;
    readonly variable?: string;
  };
  readonly web: {
    readonly url: string;
    readonly source: WebSource;
    readonly variable?: string;
  };
  readonly profile: {
    readonly name: string;
    readonly source: ProfileSource;
    readonly variable?: string;
    readonly stored: boolean;
    readonly matchesServer: boolean;
  };
  readonly auth: {
    readonly method: "token" | "api-key" | "login" | null;
    readonly source: AuthSource;
    readonly variable?: string;
    readonly fingerprint: string | null;
  };
  readonly workspace: {
    readonly id: string | null;
    readonly source: WorkspaceSource;
    readonly variable?: string;
    readonly path: string | null;
  };
  readonly project: {
    readonly ref: string | null;
    readonly source: ProjectSource;
    readonly variable?: string;
    readonly path: string | null;
  };
};

function filled(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

export function fingerprint(token: string): string | null {
  return token.length >= 12 ? token.slice(-4) : null;
}

const AUTH_METHODS = {
  flag: "token",
  env: "api-key",
  profile: "login",
} as const;

export function buildProvenance(inputs: SessionInputs): Provenance {
  const session = resolveSession(inputs);
  const { flags, env, config, repo } = inputs;
  const stored = config.profiles[session.profileName];

  const profileSource: ProfileSource = Option.isSome(flags.profile)
    ? "flag"
    : environmentSetting(env, "PROFILE")
      ? "env"
      : Object.keys(config.profiles).length > 0 && filled(config.activeProfile)
        ? "config"
        : "default";

  const serverSource: ServerSource = Option.isSome(flags.apiUrl)
    ? "flag"
    : environmentSetting(env, "API_URL")
      ? "env"
      : stored
        ? "profile"
        : "default";

  const webSource: WebSource = environmentSetting(env, "WEB_URL")
    ? "env"
    : session.profile?.webUrl
      ? "profile"
      : "server";

  const credentials = Option.getOrUndefined(session.credentials);
  const workspace = Option.getOrUndefined(session.workspace);
  const project = Option.getOrUndefined(session.project);
  const projectFromEnv =
    project?.source === "KANEO_PROJECT" ||
    project?.source === "TRACING_PROJECT";

  return {
    server: {
      url: session.apiUrl,
      source: serverSource,
      ...(serverSource === "env"
        ? { variable: environmentSetting(env, "API_URL")?.name }
        : {}),
    },
    web: {
      url: session.webUrl,
      source: webSource,
      ...(webSource === "env"
        ? { variable: environmentSetting(env, "WEB_URL")?.name }
        : {}),
    },
    profile: {
      name: session.profileName,
      source: profileSource,
      ...(profileSource === "env"
        ? { variable: environmentSetting(env, "PROFILE")?.name }
        : {}),
      stored: stored !== undefined,
      matchesServer:
        stored !== undefined &&
        normalizeBaseUrl(stored.apiUrl) === session.apiUrl,
    },
    auth: credentials
      ? {
          method: AUTH_METHODS[credentials.source],
          source: credentials.source,
          ...(credentials.source === "env"
            ? { variable: credentials.variable }
            : {}),
          fingerprint: fingerprint(Redacted.value(credentials.token)),
        }
      : { method: null, source: "none", fingerprint: null },
    workspace: workspace
      ? {
          id: workspace.id,
          source: workspace.source,
          ...(workspace.source === "env"
            ? { variable: workspace.variable }
            : {}),
          path: workspace.source === "repo" ? (repo?.path ?? null) : null,
        }
      : { id: null, source: "none", path: null },
    project: project
      ? {
          ref: project.ref,
          source: projectFromEnv ? "env" : "repo",
          ...(projectFromEnv ? { variable: project.source } : {}),
          path: projectFromEnv ? null : (repo?.path ?? null),
        }
      : { ref: null, source: "none", path: null },
  };
}
