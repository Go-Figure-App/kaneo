import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Regenerate the committed archive after changing source images.
// Requires the zip CLI (available on macOS and in most Linux development images).
const site = fileURLToPath(new URL("../", import.meta.url));
const output = join(site, "public/press");
const temporary = mkdtempSync(join(tmpdir(), "tracing-press-"));
const assets = [
  ["logo-dark.svg", "tracing-wordmark-dark.svg"],
  ["logo-light.svg", "tracing-wordmark-light.svg"],
  ["logo-512.png", "tracing-icon.png"],
];

try {
  mkdirSync(output, { recursive: true });
  const folder = join(temporary, "tracing-press-kit");
  mkdirSync(folder);
  for (const [source, destination] of assets) {
    copyFileSync(join(site, "public", source), join(folder, destination));
  }
  const files = assets.map(([, name]) => name).sort();
  // Stable timestamps and ordering keep the archive reproducible.
  const timestamp = new Date("2000-01-01T00:00:00Z");
  for (const file of files) {
    utimesSync(join(folder, file), timestamp, timestamp);
  }
  const archive = join(temporary, "tracing-press-kit.zip");
  execFileSync(
    "zip",
    ["-X", "-q", archive, ...files.map((file) => `tracing-press-kit/${file}`)],
    {
      cwd: temporary,
      env: { ...process.env, TZ: "UTC" },
    },
  );
  copyFileSync(archive, join(output, "tracing-press-kit.zip"));
  console.log("Generated public/press/tracing-press-kit.zip");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
