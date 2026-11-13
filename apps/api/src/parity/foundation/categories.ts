export const categories = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const;
export type Category = (typeof categories)[number];

export function defaultCategory(slug: string, isFinal = false): Category {
  if (/^(canceled|cancelled|declined|duplicate)$/.test(slug)) return "canceled";
  if (isFinal) return "completed";
  if (slug === "backlog" || slug === "triage") return "backlog";
  if (/^(in-progress|in-review|started|doing)$/.test(slug)) return "started";
  return "unstarted";
}
