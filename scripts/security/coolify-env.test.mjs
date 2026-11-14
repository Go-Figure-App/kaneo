import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const composeFile = fileURLToPath(
  new URL("../../compose.coolify.yml", import.meta.url),
);

function render(urls) {
  const env = { ...process.env };
  delete env.TRACING_CLIENT_URL;
  delete env.KANEO_CLIENT_URL;
  return spawnSync(
    "docker",
    [
      "compose",
      "--env-file",
      "/dev/null",
      "-f",
      composeFile,
      "config",
      "--format",
      "json",
    ],
    {
      encoding: "utf8",
      env: {
        ...env,
        SERVICE_PASSWORD_POSTGRES: "test-postgres-password",
        SERVICE_HEX_64_KANEO: "test-auth-secret-at-least-32-characters",
        ...urls,
      },
    },
  );
}

for (const [name, urls, expected] of [
  [
    "current URL takes precedence",
    {
      TRACING_CLIENT_URL: "https://tracing.example.com",
      KANEO_CLIENT_URL: "https://legacy.example.com",
    },
    "https://tracing.example.com",
  ],
  [
    "current URL works without the legacy variable",
    { TRACING_CLIENT_URL: "https://tracing.example.com" },
    "https://tracing.example.com",
  ],
  [
    "legacy URL remains supported",
    { KANEO_CLIENT_URL: "https://legacy.example.com" },
    "https://legacy.example.com",
  ],
  [
    "empty current URL falls back to legacy",
    { TRACING_CLIENT_URL: "", KANEO_CLIENT_URL: "https://legacy.example.com" },
    "https://legacy.example.com",
  ],
]) {
  test(`Coolify: ${name}`, () => {
    const result = render(urls);
    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(result.stdout);
    assert.equal(
      config.services.tracing.environment.TRACING_CLIENT_URL,
      expected,
    );
  });
}

test("Coolify requires a public URL", () => {
  const result = render({});
  assert.equal(result.status, 0, result.stderr);
  const service = JSON.parse(result.stdout).services.tracing;
  // `compose config` preserves dollar escaping for a reusable Compose file.
  const command = service.command.map((argument) =>
    argument.replaceAll("$$", "$"),
  );
  const startup = spawnSync(command[0], command.slice(1), {
    encoding: "utf8",
    env: service.environment,
  });
  assert.notEqual(startup.status, 0);
  assert.match(startup.stderr, /Set TRACING_CLIENT_URL or KANEO_CLIENT_URL/);
});
