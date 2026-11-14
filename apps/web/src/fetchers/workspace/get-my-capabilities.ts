import { client } from "@tracing/libs";
import { HttpError } from "@/lib/http-error";

async function getMyCapabilities(workspaceId: string) {
  const response = await client.workspace[":workspaceId"].capabilities.$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getMyCapabilities;
