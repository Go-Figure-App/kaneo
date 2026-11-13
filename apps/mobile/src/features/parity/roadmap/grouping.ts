import type { Roadmap, RoadmapProject } from "./api";

export function roadmapSections(data: Roadmap, noInitiative: string) {
  const sections = data.initiatives.map((initiative) => ({
    key: initiative.id,
    title: initiative.name,
    data: data.projects.filter((project) =>
      project.initiativeIds.includes(initiative.id),
    ),
  }));
  sections.push({
    key: "none",
    title: noInitiative,
    data: data.projects.filter((project) => !project.initiativeIds.length),
  });
  return sections.filter((section) => section.data.length);
}
export function nextMilestone(project: Pick<RoadmapProject, "milestones">) {
  return project.milestones
    .filter((milestone) => milestone.progress.percent < 100)
    .sort((a, b) => {
      if (a.targetDate !== b.targetDate)
        return (a.targetDate ?? "9999-12-31").localeCompare(
          b.targetDate ?? "9999-12-31",
        );
      return a.position - b.position || a.id.localeCompare(b.id);
    })[0];
}
