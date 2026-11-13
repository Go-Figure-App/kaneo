import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { usePlanningEnabled } from "./queries";

export function ProjectPlanningNav({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("projects");
  if (!enabled) return null;
  return (
    <Link
      to="/dashboard/workspace/$workspaceId/project/$projectId/overview"
      params={{ workspaceId, projectId }}
      className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
      activeProps={{ className: "bg-accent font-medium text-foreground" }}
    >
      {t("parity:planning.overview")}
    </Link>
  );
}
