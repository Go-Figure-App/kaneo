export function templateLabels<
  T extends { name: string; taskId: string | null },
>(labels: T[], names: string[]): T[] {
  const selected = new Map<string, T>();
  for (const label of labels) {
    if (!names.includes(label.name)) continue;
    if (!selected.has(label.name) || !label.taskId)
      selected.set(label.name, label);
  }
  return [...selected.values()];
}
