import { useLocalSearchParams } from "expo-router";
import { ProjectOverview } from "@/features/parity/planning/project-overview";

export default function ProjectOverviewRoute() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  return <ProjectOverview key={projectId} projectId={projectId} />;
}
