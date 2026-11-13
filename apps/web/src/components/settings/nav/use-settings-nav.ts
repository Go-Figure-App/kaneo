import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildSettingsNav } from "@/components/settings/nav/build-settings-nav";
import useAdminAccess from "@/hooks/queries/admin/use-admin-access";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useCanImport } from "@/hooks/use-can-import";
import { useTriageEnabled } from "@/components/parity/triage/queries";

export function useSettingsNav() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();
  const { data: projects } = useGetProjects({
    workspaceId: workspace?.id ?? "",
  });
  const { data: config } = useGetConfig();
  const { permissions: adminPermissions } = useAdminAccess();
  const { canImport } = useCanImport();
  const triageEnabled = useTriageEnabled();

  return useMemo(() => {
    const nav = buildSettingsNav({
      t,
      workspaceName: workspace?.name,
      billingEnabled: Boolean(config?.billingEnabled),
      canImport,
      adminPermissions,
      projects: projects ?? [],
    });
    if (triageEnabled)
      for (const project of nav.projects)
        project.links.push({
          id: `project-${project.id}-triage`,
          label: t("parity:triage.title"),
          to: `/dashboard/settings/projects/${project.id}/triage`,
        });
    return nav;
  }, [
    t,
    workspace?.name,
    config?.billingEnabled,
    canImport,
    adminPermissions,
    projects,
    triageEnabled,
  ]);
}
