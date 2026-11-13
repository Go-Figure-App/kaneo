import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { SettingsPage } from "@/components/settings/settings-page";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import {
  getTriageSettings,
  updateTriageSettings,
  type TriageSettingsInput,
} from "@/fetchers/parity/triage";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { refreshTriage, useTriageEnabled } from "./queries";

export function TriageSettings({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const enabled = useTriageEnabled();
  const { canUpdateProjects, canManageSettings } = useWorkspacePermission();
  const { data: workspace } = useActiveWorkspace();
  const members = useGetProjectMembers({
    workspaceId: workspace?.id ?? "",
    projectId,
  });
  const query = useQuery({
    queryKey: ["parity", "triage", "settings", projectId],
    queryFn: () => getTriageSettings(projectId),
    enabled: enabled && canUpdateProjects(),
  });
  const mutation = useMutation({
    mutationFn: (input: TriageSettingsInput) =>
      updateTriageSettings(projectId, input),
    onSuccess: () => refreshTriage(client),
  });
  const settings = query.data;
  const disabled = mutation.isPending || !canUpdateProjects();
  return (
    <>
      <PageTitle title={t("parity:triage.title")} />
      <SettingsPage
        title={t("parity:triage.title")}
        description={t("parity:triage.description")}
      >
        {!enabled || !canUpdateProjects() ? (
          <p>{t("parity:triage.unavailable")}</p>
        ) : query.isPending ? (
          <p role="status">{t("common:empty.loading")}</p>
        ) : (
          settings && (
            <>
              <SettingsSection title={t("parity:triage.title")}>
                <div className="flex flex-col gap-5">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      disabled={disabled}
                      onChange={(event) =>
                        mutation.mutate({ enabled: event.target.checked })
                      }
                    />
                    {t("parity:triage.enabled")}
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    {t("parity:triage.owner")}
                    <select
                      className="rounded-md border bg-background p-2"
                      disabled={disabled}
                      value={settings.ownerId ?? ""}
                      onChange={(event) =>
                        mutation.mutate({ ownerId: event.target.value || null })
                      }
                    >
                      <option value="">{t("tasks:assignee.unassigned")}</option>
                      {members.data?.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </SettingsSection>
              <SettingsSection
                title={t("parity:triage.intake")}
                description={t("parity:triage.intakeDescription")}
              >
                <div className="flex flex-col items-start gap-3">
                  <input
                    readOnly
                    aria-label={t("parity:triage.intake")}
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={
                      settings.enabled && settings.intakeToken
                        ? `${window.location.origin}/intake/${settings.intakeToken}`
                        : ""
                    }
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    variant="outline"
                    disabled={disabled || !settings.enabled}
                    onClick={() => mutation.mutate({ rotateIntakeToken: true })}
                  >
                    {t("parity:triage.rotate")}
                  </Button>
                </div>
              </SettingsSection>
              {canManageSettings() && settings.integrations.length > 0 && (
                <SettingsSection
                  title={t("settings:projectIntegrations.title")}
                  description={t("parity:triage.integration")}
                >
                  <div className="flex flex-col gap-3">
                    {settings.integrations.map((integration) => (
                      <label
                        key={integration.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={integration.enabled}
                          disabled={disabled}
                          onChange={(event) =>
                            mutation.mutate({
                              integrations: [
                                {
                                  id: integration.id,
                                  enabled: event.target.checked,
                                },
                              ],
                            })
                          }
                        />
                        <span className="capitalize">{integration.type}</span>
                      </label>
                    ))}
                  </div>
                </SettingsSection>
              )}
            </>
          )
        )}
        {query.error || mutation.error ? (
          <p role="alert" className="text-destructive">
            {query.error?.message ?? mutation.error?.message}
          </p>
        ) : null}
      </SettingsPage>
    </>
  );
}
