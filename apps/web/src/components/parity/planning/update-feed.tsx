import { uniquePageItems } from "./unique-page-items";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CommentEditor from "@/components/activity/comment-editor";
import { MarkdownRenderer } from "@/components/public-project/markdown-renderer";
import { Button } from "@/components/ui/button";
import {
  createStatusUpdate,
  getStatusUpdates,
  type ParentType,
  type StatusUpdateInput,
} from "@/fetchers/parity/status-updates";
import { formatDateMedium } from "@/lib/format";
import { HealthBadge } from "./health-badge";
import { healthValues, usePlanningLabels } from "./labels";
import { refreshPlanning } from "./queries";

export function UpdateFeed({
  parentType,
  parentId,
  canUpdate,
  initialHealth,
}: {
  parentType: ParentType;
  parentId: string;
  canUpdate: boolean;
  initialHealth: StatusUpdateInput["health"];
}) {
  const { t } = useTranslation();
  const labels = usePlanningLabels();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [selectedHealth, setHealth] = useState<
    StatusUpdateInput["health"] | null
  >(null);
  const health = selectedHealth ?? initialHealth;
  const query = useInfiniteQuery({
    queryKey: ["parity", "updates", parentType, parentId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getStatusUpdates(parentType, parentId, pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const mutation = useMutation({
    mutationKey: ["parity"],
    mutationFn: () =>
      createStatusUpdate(parentType, parentId, { body, health }),
    onSuccess: async () => {
      setBody("");
      setHealth(null);
      await refreshPlanning(client);
    },
  });
  const updates = query.isError ? [] : uniquePageItems(query.data?.pages);
  return (
    <section className="space-y-5" aria-labelledby={`updates-${parentId}`}>
      <h2 id={`updates-${parentId}`} className="text-sm font-semibold">
        {t("parity:planning.updates")}
      </h2>
      {canUpdate && (
        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) mutation.mutate();
          }}
        >
          <label className="flex items-center gap-3 text-sm">
            {t("parity:planning.health")}
            <select
              className="rounded-md border bg-background p-1.5"
              value={health}
              disabled={mutation.isPending}
              onChange={(event) =>
                setHealth(event.target.value as typeof health)
              }
            >
              {healthValues.map((value) => (
                <option key={value} value={value}>
                  {labels.health[value]}
                </option>
              ))}
            </select>
          </label>
          <CommentEditor
            showQuickAttachButton={false}
            value={body}
            onChange={setBody}
            disabled={mutation.isPending}
            placeholder={t("parity:planning.writeUpdate")}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || !body.trim()}>
              {t("parity:planning.postUpdate")}
            </Button>
          </div>
        </form>
      )}
      {query.isPending && <p role="status">{t("parity:planning.loading")}</p>}
      {query.error && (
        <div role="alert" className="text-sm text-destructive">
          {query.error.message}
          <Button variant="ghost" onClick={() => query.refetch()}>
            {t("parity:planning.retry")}
          </Button>
        </div>
      )}
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {!query.isPending && !query.error && updates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("parity:planning.noUpdates")}
        </p>
      )}
      {updates.map((update) => (
        <article
          key={update.id}
          className="space-y-3 border-b pb-5 last:border-0"
        >
          <header className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium">
              {update.authorName ?? t("parity:planning.deletedUser")}
            </span>
            <HealthBadge health={update.health} />
            <time className="text-muted-foreground" dateTime={update.createdAt}>
              {formatDateMedium(new Date(update.createdAt))}
            </time>
          </header>
          <MarkdownRenderer content={update.body} />
        </article>
      ))}
      {!query.isError && query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {t("parity:planning.loadMore")}
        </Button>
      )}
    </section>
  );
}
