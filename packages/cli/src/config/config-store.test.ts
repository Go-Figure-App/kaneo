import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Result } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { configPath } from "./config-path.js";
import { makeConfigStore } from "./config-store.js";
import { emptyConfig, withProfile } from "./format.js";

async function tempPath() {
  const directory = await mkdtemp(join(tmpdir(), "tracing-cli-"));
  return join(directory, "tracing", "config.json");
}

describe("configPath", () => {
  it("prefers TRACING_CONFIG and reuses an existing legacy configuration", async () => {
    expect(
      configPath(
        {
          TRACING_CONFIG: "/new/config.json",
          KANEO_CONFIG: "/old/config.json",
        },
        "/home/a",
      ),
    ).toBe("/new/config.json");
    const directory = await mkdtemp(join(tmpdir(), "tracing-config-compat-"));
    try {
      await mkdir(join(directory, "kaneo"));
      await writeFile(join(directory, "kaneo/config.json"), "{}");
      expect(configPath({ XDG_CONFIG_HOME: directory }, "/home/a")).toBe(
        join(directory, "kaneo/config.json"),
      );
      await mkdir(join(directory, "tracing"));
      await writeFile(join(directory, "tracing/config.json"), "{}");
      expect(configPath({ XDG_CONFIG_HOME: directory }, "/home/a")).toBe(
        join(directory, "tracing/config.json"),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("honors KANEO_CONFIG, then XDG_CONFIG_HOME, then ~/.config", () => {
    expect(configPath({ KANEO_CONFIG: "/x/c.json" }, "/home/a")).toBe(
      "/x/c.json",
    );
    expect(configPath({ XDG_CONFIG_HOME: "/xdg" }, "/home/a")).toBe(
      "/xdg/tracing/config.json",
    );
    expect(configPath({}, "/home/a")).toBe(
      "/home/a/.config/tracing/config.json",
    );
  });
});

describe("makeConfigStore", () => {
  it("loads and saves existing Kaneo profiles without losing credentials", async () => {
    const path = await tempPath();
    await mkdir(join(path, ".."), { recursive: true });
    const legacy = {
      ...withProfile(emptyConfig, "work", () => ({
        apiUrl: "https://old.example.com",
        token: "stored-legacy-token",
        workspaceId: "workspace",
        user: { id: "u1", name: "User", email: "user@example.com" },
      })),
      kind: "kaneo-cli",
    };
    await writeFile(path, JSON.stringify(legacy));
    const store = makeConfigStore(path);
    const loaded = await Effect.runPromise(store.load);
    expect(loaded).toEqual({ ...legacy, kind: "tracing-cli" });
    await Effect.runPromise(store.save(loaded));
    expect(await Effect.runPromise(store.load)).toEqual(loaded);
  });

  it("returns an empty config when the file is missing", async () => {
    const store = makeConfigStore(await tempPath());
    expect(await Effect.runPromise(store.load)).toEqual(emptyConfig);
  });

  it("writes a private file in a private directory", async () => {
    const path = await tempPath();
    const store = makeConfigStore(path);
    const config = withProfile(emptyConfig, "default", () => ({
      apiUrl: "https://tracing.gofigureapp.io",
      token: "secret",
    }));
    await Effect.runPromise(store.save(config));
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect((await stat(join(path, ".."))).mode & 0o777).toBe(0o700);
    expect(await Effect.runPromise(store.load)).toEqual(config);
  });

  it("never overwrites a file from another tracing CLI", async () => {
    const path = await tempPath();
    const store = makeConfigStore(path);
    await Effect.runPromise(store.save(emptyConfig));
    await writeFile(path, '{"apiKey":"community"}');
    const result = await Effect.runPromise(
      Effect.result(store.save(emptyConfig)),
    );
    expect(Result.isFailure(result) && result.failure.reason).toBe("foreign");
    expect(await readFile(path, "utf8")).toBe('{"apiKey":"community"}');
  });
});
