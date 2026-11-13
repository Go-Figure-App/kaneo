export function uniquePageItems<T extends { id: string }>(
  pages: ReadonlyArray<{ items: T[] }> | undefined,
): T[] {
  const seen = new Set<string>();
  return (pages ?? [])
    .flatMap((page) => page.items)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}
