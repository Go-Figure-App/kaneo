import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import {
  clearCredentials,
  credentialsPath,
  loadCredentials,
  saveCredentials,
} from "./token-store.js";

describe("credential compatibility", () => {
  let directory: string;
  const legacy = {
    version: 1 as const,
    baseUrl: "https://example.com",
    clientId: "kaneo-mcp",
    accessToken: "legacy-test-token",
  };
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "tracing-mcp-compat-"));
    vi.stubEnv("XDG_CONFIG_HOME", directory);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });
  it("reads and updates an existing legacy login", async () => {
    const oldDirectory = join(directory, "kaneo-mcp");
    await mkdir(oldDirectory);
    await writeFile(
      join(oldDirectory, "credentials.json"),
      JSON.stringify(legacy),
    );
    expect(await loadCredentials()).toEqual(legacy);
    expect(credentialsPath()).toBe(join(oldDirectory, "credentials.json"));
    await saveCredentials({ ...legacy, accessToken: "updated-test-token" });
    expect((await loadCredentials())?.accessToken).toBe("updated-test-token");
  });
  it("prefers Tracing credentials and signs out without resurrecting a legacy login", async () => {
    await saveCredentials({
      ...legacy,
      clientId: "tracing-mcp",
      accessToken: "current-test-token",
    });
    await mkdir(join(directory, "kaneo-mcp"));
    await writeFile(
      join(directory, "kaneo-mcp/credentials.json"),
      JSON.stringify(legacy),
    );
    expect((await loadCredentials())?.accessToken).toBe("current-test-token");
    await clearCredentials();
    expect(await loadCredentials()).toBeNull();
    await clearCredentials();
  });
});
