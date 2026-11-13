import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { setFavorite, type FavoriteTarget } from "@/fetchers/parity/views";
import { toast } from "@/lib/toast";
import { usePlanningEnabled } from "../planning/queries";
import { refreshViews, useFavorites } from "./queries";
export function FavoriteButton({
  workspaceId,
  kind,
  targetId,
}: FavoriteTarget & { workspaceId: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const enabled = usePlanningEnabled("views");
  const query = useFavorites(workspaceId);
  const selected =
    !query.isError &&
    query.data?.items.some(
      (item) => item.kind === kind && item.targetId === targetId,
    );
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => setFavorite(workspaceId, { kind, targetId }, !selected),
    onSuccess: () => refreshViews(client),
    onError: (error) => toast.error(error.message),
  });
  if (!enabled) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      aria-label={t(
        selected ? "parity:views.unfavorite" : "parity:views.favorite",
      )}
      aria-pressed={Boolean(selected)}
      disabled={mutation.isPending || query.isPending || query.isError}
      onClick={() => mutation.mutate()}
    >
      <Star className={selected ? "size-4 fill-current" : "size-4"} />
    </Button>
  );
}
