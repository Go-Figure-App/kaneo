import { client } from "@tracing/libs";
import { HttpError } from "@/lib/http-error";

export async function getUserSessions() {
  const response = await client.user.sessions.$get();

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}
