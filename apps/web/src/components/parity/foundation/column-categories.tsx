import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/settings/settings-section";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import {
  getParityColumns,
  getParityFeatures,
  updateParityColumn,
  type Category,
} from "@/fetchers/parity/foundation";

export function ColumnCategories({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const { canUpdateProjects } = useWorkspacePermission();
  const flags = useQuery({
    queryKey: ["parity", "features"],
    queryFn: getParityFeatures,
  });
  const enabled = flags.data?.features.includes("foundation") ?? false;
  const columns = useQuery({
    queryKey: ["parity", "columns", projectId],
    queryFn: () => getParityColumns(projectId),
    enabled,
  });
  const mutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: Category }) =>
      updateParityColumn(projectId, id, category),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["parity", "columns", projectId] }),
  });
  if (!enabled) return null;
  const labels = {
    backlog: t("parity:categories.backlog"),
    unstarted: t("parity:categories.unstarted"),
    started: t("parity:categories.started"),
    completed: t("parity:categories.completed"),
    canceled: t("parity:categories.canceled"),
  };
  return (
    <SettingsSection
      title={t("parity:categories.title")}
      description={t("parity:categories.description")}
    >
      {columns.isPending ? (
        <p role="status">{t("parity:categories.loading")}</p>
      ) : null}
      {columns.isError || mutation.isError ? (
        <p role="alert" className="text-destructive">
          {t("parity:categories.error")}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {columns.data?.map((column) => (
          <label
            key={column.id}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span>{column.name}</span>
            <select
              aria-label={t("parity:categories.label", { name: column.name })}
              className="rounded-md border border-input bg-background px-3 py-2"
              value={column.category}
              disabled={mutation.isPending || !canUpdateProjects()}
              onChange={(event) =>
                mutation.mutate({
                  id: column.id,
                  category: event.target.value as Category,
                })
              }
            >
              {Object.entries(labels).map(([category, label]) => (
                <option key={category} value={category}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </SettingsSection>
  );
}
