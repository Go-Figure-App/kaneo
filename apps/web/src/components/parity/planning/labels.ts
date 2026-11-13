import { useTranslation } from "react-i18next";

export const projectStatuses = [
  "backlog",
  "planned",
  "started",
  "paused",
  "completed",
  "canceled",
] as const;
export const initiativeStatuses = ["planned", "active", "completed"] as const;
export const healthValues = ["on_track", "at_risk", "off_track"] as const;
export const priorities = [
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
] as const;
export function usePlanningLabels() {
  const { t } = useTranslation();
  return {
    status: {
      backlog: t("parity:planning.statusBacklog"),
      planned: t("parity:planning.statusPlanned"),
      started: t("parity:planning.statusStarted"),
      paused: t("parity:planning.statusPaused"),
      completed: t("parity:planning.statusCompleted"),
      canceled: t("parity:planning.statusCanceled"),
      active: t("parity:planning.statusActive"),
    },
    health: {
      on_track: t("parity:planning.healthOnTrack"),
      at_risk: t("parity:planning.healthAtRisk"),
      off_track: t("parity:planning.healthOffTrack"),
    },
    priority: {
      "no-priority": t("parity:planning.priorityNone"),
      low: t("parity:planning.priorityLow"),
      medium: t("parity:planning.priorityMedium"),
      high: t("parity:planning.priorityHigh"),
      urgent: t("parity:planning.priorityUrgent"),
    },
  };
}
