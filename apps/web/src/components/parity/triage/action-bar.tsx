import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import type { TriageDecision, TriageItem } from "@/fetchers/parity/triage";
import { TriageDecisionForm } from "./decision-form";

export function TriageActionBar({
  item,
  workspaceId,
}: {
  item: TriageItem;
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const { canUpdateTasks } = useWorkspacePermission();
  const allowed = canUpdateTasks();
  const [action, setAction] = useState<TriageDecision["action"] | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !allowed ||
        action ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.defaultPrevented
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog], [role=menu]",
        )
      )
        return;
      const shortcut = (
        {
          "1": "accept",
          "2": "duplicate",
          "3": "decline",
          h: "snooze",
        } as const
      )[event.key.toLowerCase() as "1" | "2" | "3" | "h"];
      if (shortcut) {
        event.preventDefault();
        setAction(shortcut);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allowed, action]);
  if (!allowed) return null;
  const labels = {
    accept: t("parity:triage.accept"),
    duplicate: t("parity:triage.duplicate"),
    decline: t("parity:triage.decline"),
    snooze: t("parity:triage.snooze"),
  };
  return (
    <>
      <div className="flex flex-wrap gap-2 border-b p-4">
        {(["accept", "duplicate", "decline", "snooze"] as const).map(
          (value, index) => (
            <Button
              key={value}
              size="sm"
              variant={value === "accept" ? "default" : "outline"}
              onClick={() => setAction(value)}
            >
              {labels[value]}
              <kbd className="ml-1 opacity-50">
                {index < 3 ? index + 1 : "H"}
              </kbd>
            </Button>
          ),
        )}
      </div>
      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action && labels[action]}</DialogTitle>
            <DialogDescription>{item.title}</DialogDescription>
          </DialogHeader>
          {action && (
            <TriageDecisionForm
              key={`${item.id}:${action}`}
              item={item}
              action={action}
              workspaceId={workspaceId}
              onDone={() => setAction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
