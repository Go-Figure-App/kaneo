import { eq } from "drizzle-orm";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectExtTable } from "../../database/schema-parity";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../../openapi";
import { readClientIp } from "../../utils/client-ip";
import { requireParity } from "../foundation/features";
import { createTriageItem } from "./controllers/create";
import { intakeBody } from "./schema";
import { IntakeLimiter } from "./intake-limit";

const limiter = new IntakeLimiter();
const route = createRoute({
  method: "post",
  path: "/triage/intake/{token}",
  operationId: "submitTriageIntake",
  tags: ["Parity"],
  security: [],
  summary: "Submit an item through a project's revocable intake link",
  middleware: [
    requireParity("triage"),
    bodyLimit({ maxSize: 65_536 }),
  ] as const,
  request: {
    params: z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }),
    body: {
      required: true,
      content: { "application/json": { schema: intakeBody } },
    },
  },
  responses: {
    202: jsonResponse(
      "Submission received",
      z.object({ received: z.literal(true) }),
    ),
    400: errorResponse("Invalid submission"),
    404: errorResponse("Intake unavailable"),
    413: errorResponse("Submission too large"),
    429: errorResponse("Too many submissions"),
  },
});
export default apiRouter().openapi(route, async (c) => {
  const { token } = c.req.valid("param");
  if (!limiter.allow(token, readClientIp(c.req.raw.headers))) {
    c.header("Retry-After", "60");
    throw new HTTPException(429, {
      message: "Please wait before sending another submission",
    });
  }
  const [project] = await db
    .select({ id: projectExtTable.projectId })
    .from(projectExtTable)
    .where(eq(projectExtTable.intakeToken, token));
  if (!project)
    throw new HTTPException(404, { message: "Triage intake is unavailable" });
  const input = c.req.valid("json");
  await createTriageItem(project.id, input, {
    email: input.reporterEmail,
    token,
  });
  return c.json({ received: true as const }, 202);
});
