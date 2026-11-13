import { useLocalSearchParams } from "expo-router";
import { InsightsScreen } from "@/features/parity/insights/insights-screen";
export default function InsightsRoute() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <InsightsScreen key={workspaceId} workspaceId={workspaceId} />;
}
