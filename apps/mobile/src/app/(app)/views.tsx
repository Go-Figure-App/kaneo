import { useLocalSearchParams } from "expo-router";
import { ViewsScreen } from "@/features/parity/views/views-screen";
export default function Page() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <ViewsScreen key={workspaceId} workspaceId={workspaceId} />;
}
