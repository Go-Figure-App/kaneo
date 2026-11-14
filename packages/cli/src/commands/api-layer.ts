import { Layer } from "effect";
import { TracingApiLive } from "../api/tracing-api.js";
import { SessionLive } from "../services/session.js";

export const ApiLayer = TracingApiLive.pipe(Layer.provideMerge(SessionLive));
