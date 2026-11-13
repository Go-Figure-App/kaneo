import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CreateTaskRequest } from "@/fetchers/task/create-task";
import { createTriage, getTriageProjects } from "@/fetchers/parity/triage";
import { refreshTriage, useTriageEnabled } from "./queries";

export function useCreatePendingTask() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["parity"],
    mutationFn: ({
      projectId,
      status: _status,
      ...input
    }: CreateTaskRequest & { estimate?: number | null }) =>
      createTriage(projectId, { ...input, userId: input.userId || undefined }),
    onSuccess: () => refreshTriage(client),
  });
}

export function TriageCreateOption({
  workspaceId,
  projectId,
  checked,
  onChange,
  disabled,
}: {
  workspaceId?: string;
  projectId?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const enabled = useTriageEnabled();
  const projects = useQuery({
    queryKey: ["parity", "triage", workspaceId, "projects"],
    queryFn: () => getTriageProjects(workspaceId!),
    enabled: enabled && Boolean(workspaceId),
  });
  const available =
    enabled &&
    Boolean(projects.data?.some((project) => project.id === projectId));
  useEffect(() => {
    if (!available && checked) onChange(false);
  }, [available, checked, onChange]);
  if (!available) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t("parity:triage.send")}
    </label>
  );
}
