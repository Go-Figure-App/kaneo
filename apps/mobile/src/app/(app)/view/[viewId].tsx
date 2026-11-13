import { useLocalSearchParams } from "expo-router";
import { ViewScreen } from "@/features/parity/views/view-screen";
export default function Page() {
  const { workspaceId, viewId } = useLocalSearchParams<{
    workspaceId: string;
    viewId: string;
  }>();
  return (
    <ViewScreen
      key={workspaceId + viewId}
      workspaceId={workspaceId}
      viewId={viewId}
    />
  );
}
