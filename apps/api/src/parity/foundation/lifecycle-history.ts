export type LifecycleTransition = {
  projectId?: string;
  previousProjectId?: string;
  status: string;
  previousStatus?: string;
  at: Date;
};

type Activity = {
  type: string;
  createdAt: Date;
  eventData: unknown;
};

export function lifecycleHistory(
  activities: Activity[],
  currentProjectId: string,
  observation?: LifecycleTransition,
) {
  const transitions: LifecycleTransition[] = activities.flatMap((activity) => {
    const data = activity.eventData as Record<string, unknown> | null;
    if (typeof data?.newStatus !== "string") return [];
    return [
      {
        status: data.newStatus,
        previousStatus:
          typeof data.oldStatus === "string" ? data.oldStatus : undefined,
        projectId:
          activity.type === "moved" && typeof data.toProjectId === "string"
            ? data.toProjectId
            : undefined,
        previousProjectId:
          activity.type === "moved" && typeof data.fromProjectId === "string"
            ? data.fromProjectId
            : undefined,
        at: activity.createdAt,
      },
    ];
  });
  if (observation) transitions.push(observation);
  transitions.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Ordinary status activities omit their project. Walk backward from the
  // current project, crossing each recorded move to recover that context.
  let projectId = currentProjectId;
  return transitions
    .reverse()
    .map((transition) => {
      const destination = transition.projectId ?? projectId;
      const source = transition.previousProjectId ?? destination;
      projectId = source;
      return {
        ...transition,
        projectId: destination,
        previousProjectId: source,
      };
    })
    .reverse();
}
