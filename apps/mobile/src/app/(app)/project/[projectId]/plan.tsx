import { useLocalSearchParams } from "expo-router";
import { ProjectPlanEditor } from "@/features/parity/planning/project-editor";

export default function ProjectPlanRoute() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  return <ProjectPlanEditor key={projectId} projectId={projectId} />;
}
