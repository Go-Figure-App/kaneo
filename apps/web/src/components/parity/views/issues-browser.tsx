import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceTasks,
  saveView,
  type SavedView,
  type ViewDisplay,
  type ViewFilters,
} from "@/fetchers/parity/views";
import { uniquePageItems } from "../planning/unique-page-items";
import { defaultDisplay, validFilters } from "./display";
import { DisplayOptions } from "./display-options";
import { FilterBuilder } from "./filter-builder";
import { refreshViews, useViewOptions } from "./queries";
import { SaveViewDialog } from "./save-view-dialog";
import { TaskCollection } from "./task-collection";

export function IssuesBrowser({
  workspaceId,
  view,
}: {
  workspaceId: string;
  view?: SavedView;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [draftFilters, setFilters] = useState<ViewFilters>();
  const [draftDisplay, setDisplay] = useState<ViewDisplay>();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [savingCopy, setSavingCopy] = useState(false);
  const filters = draftFilters ?? view?.filters ?? [];
  const display = draftDisplay ?? view?.display ?? defaultDisplay;
  const projectFilter = filters.find(
    (filter) =>
      filter.field === "project" &&
      filter.operator === "is" &&
      filter.values.length === 1,
  );
  const filteredProjectId =
    projectFilter && "values" in projectFilter
      ? (projectFilter.values[0] ?? undefined)
      : undefined;
  const options = useViewOptions(
    workspaceId,
    view?.projectId ?? filteredProjectId,
  );

  const valid = validFilters(filters);
  const query = useInfiniteQuery({
    queryKey: [
      "parity",
      "workspace-tasks",
      workspaceId,
      filters,
      display.orderBy,
      display.direction,
      deferredSearch,
      view?.projectId,
    ],
    queryFn: ({ pageParam }) =>
      getWorkspaceTasks(workspaceId, {
        page: String(pageParam),
        pageSize: "100",
        filters: JSON.stringify(filters),
        search: deferredSearch,
        projectId: view?.projectId ?? undefined,
        orderBy: display.orderBy,
        direction: display.direction,
      }),
    initialPageParam: 1,
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
    enabled: valid,
  });
  const save = useMutation({
    mutationKey: ["parity"],
    mutationFn: () => {
      if (!view) throw new Error("Missing view");
      return saveView(
        workspaceId,
        {
          name: view.name,
          icon: view.icon,
          projectId: view.projectId,
          shared: view.shared,
          filters,
          display,
        },
        view.id,
      );
    },
    onSuccess: async () => {
      await refreshViews(client);
      setFilters(undefined);
      setDisplay(undefined);
    },
  });
  const tasks =
    query.isError || !valid ? [] : uniquePageItems(query.data?.pages);
  const dirty =
    JSON.stringify(filters) !== JSON.stringify(view?.filters ?? []) ||
    JSON.stringify(display) !== JSON.stringify(view?.display ?? defaultDisplay);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label={t("parity:views.search")}
          placeholder={t("parity:views.search")}
          maxLength={200}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 min-w-48 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <DisplayOptions value={display} onChange={setDisplay} />
        {view?.canEdit && dirty && (
          <Button
            size="sm"
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
          >
            {t("parity:views.saveChanges")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={!valid}
          onClick={() => setSavingCopy(true)}
        >
          {t(view ? "parity:views.saveCopy" : "parity:views.newView")}
        </Button>
      </div>
      <FilterBuilder
        filters={filters}
        onChange={setFilters}
        options={options.isError ? undefined : options.data}
      />
      {options.error && (
        <div role="alert" className="text-sm text-destructive">
          {options.error.message}
          <Button variant="ghost" onClick={() => options.refetch()}>
            {t("parity:planning.retry")}
          </Button>
        </div>
      )}
      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          {t("parity:views.invalidFilters")}
        </p>
      )}
      {save.error && (
        <p role="alert" className="text-sm text-destructive">
          {save.error.message}
        </p>
      )}
      {valid && query.isPending && (
        <p role="status">{t("parity:planning.loading")}</p>
      )}
      {query.error && (
        <div role="alert">
          {query.error.message}
          <Button variant="ghost" onClick={() => query.refetch()}>
            {t("parity:planning.retry")}
          </Button>
        </div>
      )}
      {valid && !query.isPending && !query.isError && (
        <>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {t("parity:views.loaded", { total: tasks.length })}
              {query.hasNextPage ? ` · ${t("parity:views.partial")}` : ""}
            </span>
            <span>
              {t("parity:views.datesIn", {
                zone: query.data?.pages[0]?.timeZone ?? "UTC",
              })}
            </span>
          </div>
          {tasks.length ? (
            <TaskCollection
              tasks={tasks}
              workspaceId={workspaceId}
              display={display}
              timeZone={query.data?.pages[0]?.timeZone ?? "UTC"}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("parity:views.noIssues")}
            </p>
          )}
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              {t("parity:views.more")}
            </Button>
          )}
        </>
      )}
      {savingCopy && (
        <SaveViewDialog
          workspaceId={workspaceId}
          initial={{
            name: view?.name ?? "",
            icon: view?.icon,
            projectId: view?.projectId,
            shared: false,
            filters,
            display,
          }}
          onClose={() => setSavingCopy(false)}
          onSaved={(id) => {
            void navigate({
              to: "/dashboard/workspace/$workspaceId/views/$viewId",
              params: { workspaceId, viewId: id },
            });
          }}
        />
      )}
    </div>
  );
}
