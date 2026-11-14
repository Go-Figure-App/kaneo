// Loaded only by the disposable parity Compose overlay, never by an image.
import { createRequire } from "node:module";
import {
  fixtureFetch,
  linearFixture,
} from "../../apps/api/src/parity/import/__fixtures__/linear.ts";

const database = new URL(process.env.DATABASE_URL ?? "file:///missing");
if (
  process.env.PARITY_E2E_LINEAR_FIXTURE !== "1" ||
  database.hostname !== "postgres" ||
  database.pathname !== "/kaneo_e2e"
) {
  throw new Error(
    "The Linear fixture requires the disposable browser database.",
  );
}
const require = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const { Agent, MockAgent } = require("undici");
const mock = new MockAgent();
mock.disableNetConnect();
const pool = mock.get("https://api.linear.app");
const source = fixtureFetch(linearFixture());
pool
  .intercept({ path: "/graphql", method: "POST" })
  .reply(async ({ body }) => {
    let payload = "";
    if (typeof body === "string") payload = body;
    else if (body?.[Symbol.asyncIterator]) {
      for await (const chunk of body)
        payload += Buffer.from(chunk).toString("utf8");
    } else payload = Buffer.from(body ?? "").toString("utf8");
    const response = await source("https://api.linear.app/graphql", {
      body: payload,
    });
    return {
      statusCode: response.status,
      data: await response.text(),
      responseOptions: { headers: { "content-type": "application/json" } },
    };
  })
  .persist();
const dispatch = Agent.prototype.dispatch;
Agent.prototype.dispatch = function (options, handler) {
  if (String(options.origin) === "https://api.linear.app")
    return pool.dispatch(options, handler);
  return dispatch.call(this, options, handler);
};
