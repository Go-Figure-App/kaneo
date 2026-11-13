import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCycles } from "@/fetchers/parity/cycles";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { usePlanningEnabled } from "../planning/queries";
import { CycleTaskList } from "./task-list";

export function MyCycleTasks({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const enabled = usePlanningEnabled("cycles");
  const { data: session } = authClient.useSession();
  const query = useQuery({
    queryKey: ["parity", "my-cycle", workspaceId, "current"],
    queryFn: () => getCycles(workspaceId, "current"),
    enabled: enabled && Boolean(session?.user.id),
  });
  if (!enabled || !session?.user.id) return null;
  if (query.error)
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        {query.error.message}
        <Button variant="ghost" onClick={() => void query.refetch()}>
          {t("parity:cycles.retry")}
        </Button>
      </p>
    );
  const cycle = query.data?.items[0];
  if (!cycle || !query.data?.settings.cyclesEnabled) return null;
  return (
    <section className="space-y-3 border-b p-4">
      <h2 className="text-sm font-medium">
        <Link
          to="/dashboard/workspace/$workspaceId/cycles/$cycleId"
          params={{ workspaceId, cycleId: cycle.id }}
          className="hover:underline"
        >
          {t("parity:cycles.thisCycle")}
        </Link>
      </h2>
      <CycleTaskList
        key={cycle.id}
        cycleId={cycle.id}
        workspaceId={workspaceId}
        settings={query.data.settings}
        assigneeId={session.user.id}
        compact
      />
    </section>
  );
}
