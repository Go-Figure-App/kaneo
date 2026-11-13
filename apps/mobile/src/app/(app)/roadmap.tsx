import { useLocalSearchParams } from "expo-router";
import { RoadmapScreen } from "@/features/parity/roadmap/roadmap-screen";

export default function RoadmapRoute() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <RoadmapScreen key={workspaceId} workspaceId={workspaceId} />;
}
