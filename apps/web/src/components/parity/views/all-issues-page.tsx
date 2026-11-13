import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { usePlanningEnabled } from "../planning/queries";
import { IssuesBrowser } from "./issues-browser";
export function AllIssuesPage({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("views");
  return (
    <WorkspaceLayout title={t("parity:views.allIssues")}>
      <PageTitle title={t("parity:views.allIssues")} />
      <div className="h-full overflow-auto p-4 sm:p-6">
        {enabled ? (
          <IssuesBrowser workspaceId={workspaceId} />
        ) : (
          <p>{t("parity:planning.unavailable")}</p>
        )}
      </div>
    </WorkspaceLayout>
  );
}
