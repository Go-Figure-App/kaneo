import { client } from "@tracing/libs";
import { HttpError } from "@/lib/http-error";

export async function getParityFeatures() {
  const response = await client.parity.features.$get();
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function getParityColumns(projectId: string) {
  const response = await client.parity.columns[":projectId"].$get({
    param: { projectId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export type Category = Awaited<
  ReturnType<typeof getParityColumns>
>[number]["category"];

export async function updateParityColumn(
  projectId: string,
  columnId: string,
  category: Category,
) {
  const response = await client.parity.columns[":projectId"][":columnId"].$put({
    param: { projectId, columnId },
    json: { category },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
