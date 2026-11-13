import { useLocalSearchParams } from "expo-router";
import { ViewScreen } from "@/features/parity/views/view-screen";
export default function Page() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  return <ViewScreen key={workspaceId} workspaceId={workspaceId} />;
}
