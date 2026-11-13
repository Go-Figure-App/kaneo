import { Link, useLocation } from "@tanstack/react-router";
import { CircleDashed } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { usePlanningEnabled } from "../planning/queries";

export function CycleNavigation({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("cycles");
  const location = useLocation();
  if (!enabled) return null;
  const active = location.pathname.startsWith(
    `/dashboard/workspace/${workspaceId}/cycles`,
  );
  const phase =
    new URLSearchParams(location.searchStr).get("phase") ?? "current";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={t("parity:cycles.title")}
        className="h-8 text-sm"
        render={
          <Link
            to="/dashboard/workspace/$workspaceId/cycles"
            params={{ workspaceId }}
            search={{ phase: "current" }}
          />
        }
      >
        <CircleDashed aria-hidden="true" />
        <span>{t("parity:cycles.title")}</span>
      </SidebarMenuButton>
      {active && (
        <SidebarMenuSub>
          {(["current", "upcoming", "past"] as const).map((tab) => (
            <SidebarMenuSubItem key={tab}>
              <SidebarMenuSubButton
                isActive={
                  phase === tab && location.pathname.endsWith("/cycles")
                }
                render={
                  <Link
                    to="/dashboard/workspace/$workspaceId/cycles"
                    params={{ workspaceId }}
                    search={{ phase: tab }}
                  />
                }
              >
                {t(`parity:cycles.${tab}`)}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
