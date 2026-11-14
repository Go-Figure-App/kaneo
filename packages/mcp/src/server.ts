import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuthService } from "./auth/auth-service.js";
import { TracingClient } from "./tracing/client.js";
import { registerTools } from "./tools/register.js";
import { normalizeBaseUrl } from "./utils/normalize-base-url.js";

const require = createRequire(import.meta.url);
const { version: packageVersion } = require("../package.json") as {
  version: string;
};

export function createMcpServer(): McpServer {
  const baseUrl = normalizeBaseUrl(
    (process.env.TRACING_API_URL ?? process.env.KANEO_API_URL) ||
      "http://localhost:1337",
  );
  const clientId =
    (process.env.TRACING_MCP_CLIENT_ID ?? process.env.KANEO_MCP_CLIENT_ID) ||
    "tracing-mcp";
  const apiKey =
    (process.env.TRACING_API_KEY ?? process.env.KANEO_API_KEY) || undefined;
  const auth = new AuthService({ baseUrl, clientId, apiKey });
  const client = new TracingClient({ baseUrl, auth });
  const server = new McpServer({
    name: "tracing-mcp",
    version: packageVersion,
  });
  registerTools(server, { client });
  return server;
}
