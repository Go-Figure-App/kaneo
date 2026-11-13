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
  const { t } = useTranslation(["mobile"]);
  return {
    status: {
      backlog: t("mobile:parity.planning.statusBacklog"),
      planned: t("mobile:parity.planning.statusPlanned"),
      started: t("mobile:parity.planning.statusStarted"),
      paused: t("mobile:parity.planning.statusPaused"),
      completed: t("mobile:parity.planning.statusCompleted"),
      canceled: t("mobile:parity.planning.statusCanceled"),
      active: t("mobile:parity.planning.statusActive"),
    },
    health: {
      on_track: t("mobile:parity.planning.healthOnTrack"),
      at_risk: t("mobile:parity.planning.healthAtRisk"),
      off_track: t("mobile:parity.planning.healthOffTrack"),
    },
    priority: {
      "no-priority": t("mobile:parity.planning.priorityNone"),
      low: t("mobile:parity.planning.priorityLow"),
      medium: t("mobile:parity.planning.priorityMedium"),
      high: t("mobile:parity.planning.priorityHigh"),
      urgent: t("mobile:parity.planning.priorityUrgent"),
    },
  };
}
