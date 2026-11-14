import Svg, { Path, Text } from "react-native-svg";

import { useIsDark } from "@/theme";

/** Shared T silhouette used by the web, email and native icons. */
const MARK = [
  "M22 18H82A6 6 0 0 1 88 24V34A6 6 0 0 1 82 40H64V82A6 6 0 0 1 58 88H46A6 6 0 0 1 40 82V40H22A6 6 0 0 1 16 34V24A6 6 0 0 1 22 18Z",
];

/** Tracing's ink: #141414 on light surfaces, #F5F5F5 on dark ones, as in the web app. */
function useBrandColor() {
  return useIsDark() ? "#F5F5F5" : "#141414";
}

/** The Tracing logo: the T mark followed by the wordmark. */
export function TracingLogo({ height = 32 }: { height?: number }) {
  const color = useBrandColor();
  return (
    <Svg
      width={(height * 450) / 104}
      height={height}
      viewBox="0 0 450 104"
      accessibilityLabel="Tracing"
    >
      {MARK.map((d) => (
        <Path key={d.slice(0, 12)} d={d} fill={color} />
      ))}
      <Text x={132} y={80} fontSize={76} fontWeight="700" fill={color}>
        Tracing
      </Text>
    </Svg>
  );
}

/** Just the T mark, for tight spaces. */
export function TracingMark({ size = 24 }: { size?: number }) {
  const color = useBrandColor();
  return (
    <Svg width={size} height={size} viewBox="0 0 104 104">
      {MARK.map((d) => (
        <Path key={d.slice(0, 12)} d={d} fill={color} />
      ))}
    </Svg>
  );
}
