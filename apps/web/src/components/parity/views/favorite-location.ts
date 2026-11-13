import type { Favorite } from "@/fetchers/parity/views";
export function favoriteLocation(workspaceId: string, favorite: Favorite) {
  const base = `/dashboard/workspace/${encodeURIComponent(workspaceId)}`;
  const id = encodeURIComponent(favorite.targetId);
  switch (favorite.kind) {
    case "view":
      return `${base}/views/${id}`;
    case "project":
      return `${base}/project/${id}/overview`;
    case "initiative":
      return `${base}/initiatives/${id}`;
    case "cycle":
      return `${base}/cycles/${id}`;
    case "task":
      return `${base}/project/${encodeURIComponent(favorite.projectId ?? "")}/task/${id}`;
  }
}
