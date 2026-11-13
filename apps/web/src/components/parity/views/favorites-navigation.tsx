import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, MoreHorizontal, Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  reorderFavorites,
  setFavorite,
  type FavoriteTarget,
} from "@/fetchers/parity/views";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { toast } from "@/lib/toast";
import { usePlanningEnabled } from "../planning/queries";
import { favoriteLocation } from "./favorite-location";
import { refreshViews, useFavorites } from "./queries";

export function FavoritesNavigation() {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("views");
  const { data: workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id ?? "";
  const query = useFavorites(workspaceId);
  const items = query.isError ? [] : (query.data?.items ?? []);
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const reorder = useMutation({
    mutationKey: ["parity"],
    mutationFn: ({ index, offset }: { index: number; offset: number }) => {
      const targets = items.map(({ kind, targetId }) => ({ kind, targetId }));
      [targets[index], targets[index + offset]] = [
        targets[index + offset],
        targets[index],
      ];
      return reorderFavorites(workspaceId, targets);
    },
    onSettled: () => refreshViews(client),
    onError: (error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationKey: ["parity"],
    mutationFn: (target: FavoriteTarget) =>
      setFavorite(workspaceId, target, false),
    onSuccess: () => refreshViews(client),
    onError: (error) => toast.error(error.message),
  });
  if (!enabled || !workspace || (!items.length && !query.error)) return null;
  return (
    <SidebarGroup className="min-h-0 shrink p-2">
      <SidebarGroupLabel>{t("parity:views.favorites")}</SidebarGroupLabel>
      {query.error && (
        <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
          {t("parity:planning.retry")}
        </Button>
      )}
      <SidebarMenu className="max-h-60 overflow-y-auto">
        {items.map((item, index) => {
          const url = favoriteLocation(workspaceId, item);
          return (
            <SidebarMenuItem
              key={`${item.kind}:${item.targetId}`}
              className="flex items-center"
            >
              <SidebarMenuButton
                tooltip={item.title}
                isActive={location.pathname === url}
                onClick={() => navigate({ to: url })}
                className="min-w-0 flex-1"
              >
                <Star className="size-4" aria-hidden="true" />
                <span>{item.title}</span>
              </SidebarMenuButton>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    aria-label={t("parity:views.favoriteActions", {
                      title: item.title,
                    })}
                  >
                    <MoreHorizontal className="size-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-auto p-1">
                  <div className="flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("parity:views.moveUp")}
                      disabled={
                        index === 0 || reorder.isPending || remove.isPending
                      }
                      onClick={() => reorder.mutate({ index, offset: -1 })}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("parity:views.moveDown")}
                      disabled={
                        index === items.length - 1 ||
                        reorder.isPending ||
                        remove.isPending
                      }
                      onClick={() => reorder.mutate({ index, offset: 1 })}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("parity:views.unfavorite")}
                      disabled={remove.isPending || reorder.isPending}
                      onClick={() =>
                        remove.mutate({
                          kind: item.kind,
                          targetId: item.targetId,
                        })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
