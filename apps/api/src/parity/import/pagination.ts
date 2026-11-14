import type { Connection } from "./types";

export async function collectPages<T>(
  read: (after: string | null) => Promise<Connection<T>>,
  initial?: Connection<T>,
): Promise<T[]> {
  const rows: T[] = [];
  const cursors = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < 1_000; page++) {
    const result: Connection<T> =
      page === 0 && initial ? initial : await read(after);
    if (!Array.isArray(result?.nodes) || !result.pageInfo)
      throw new Error("Linear returned an invalid page.");
    rows.push(...result.nodes);
    if (!result.pageInfo.hasNextPage) return rows;
    after = result.pageInfo.endCursor;
    if (!after || cursors.has(after))
      throw new Error(
        "Linear pagination did not advance; no partial page was imported.",
      );
    cursors.add(after);
  }
  throw new Error(
    "This Linear collection exceeds the import page limit. Import fewer projects at a time.",
  );
}
