import { client } from "@tracing/libs";
import { HttpError } from "@/lib/http-error";

export async function getAdminOverview() {
  const response = await client.admin.overview.$get();
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
