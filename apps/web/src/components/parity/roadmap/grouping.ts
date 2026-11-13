import type { Roadmap, RoadmapProject } from "@/fetchers/parity/roadmap";

export type Filters = {
  status: string;
  lead: string;
  initiative: string;
  health: string;
};
export const emptyFilters: Filters = {
  status: "",
  lead: "",
  initiative: "",
  health: "",
};
export function filteredProjects(projects: RoadmapProject[], filters: Filters) {
  return projects.filter(
    (project) =>
      (!filters.status || project.status === filters.status) &&
      (!filters.health || project.health === filters.health) &&
      (!filters.lead ||
        (filters.lead === "none"
          ? !project.leadId
          : project.leadId === filters.lead)) &&
      (!filters.initiative ||
        (filters.initiative === "none"
          ? !project.initiativeIds.length
          : project.initiativeIds.includes(filters.initiative))),
  );
}
export function roadmapGroups(
  projects: RoadmapProject[],
  initiatives: Roadmap["initiatives"],
  selected = "",
) {
  const groups = initiatives
    .filter((initiative) => !selected || selected === initiative.id)
    .map((initiative) => ({
      id: initiative.id,
      name: initiative.name,
      projects: projects.filter((project) =>
        project.initiativeIds.includes(initiative.id),
      ),
    }));
  if (!selected || selected === "none")
    groups.push({
      id: "none",
      name: "",
      projects: projects.filter((project) => !project.initiativeIds.length),
    });
  return groups.filter((group) => group.projects.length);
}
