import Svg, { Path, Text } from "react-native-svg";

import { useIsDark } from "@/theme";

/** Original Kaneo mark retained under the upstream MIT license (`logo-light.svg` / `logo-dark.svg` in the web app). */
const MARK = [
  "M14.6855 95.7248C10.5715 96.5963 8 95.2648 8 93.6604L8 62.0256C8 61.8599 8.00323 61.686 8.00879 61.5071C8.00389 61.385 8.00098 61.2492 8.00098 61.0979L8.00098 29.9436C8.01504 28.6517 8.25897 27.7441 11.2588 27.1086L25.3145 24.2756C29.4285 23.4042 32 24.7356 32 26.3401L32 57.9748C32 58.1408 31.9978 58.3151 31.9922 58.4944C31.9971 58.6162 31.999 58.7517 31.999 58.9026L31.999 90.0569C31.985 91.3487 31.7411 92.2563 28.7412 92.8918L14.6855 95.7248Z",
  "M46.6855 87.7244C42.5715 88.5958 40 87.2643 40 85.66L40 54.0262C40 53.8602 40.0032 53.6859 40.0088 53.5066C40.0039 53.3846 40.001 53.2486 40.001 53.0975L40.001 21.9441C40.0151 20.6524 40.2592 19.7446 43.2588 19.1092L57.3145 16.2771C61.4284 15.4057 64 16.7363 64 18.3406L64 49.9744C64 50.1405 63.9978 50.3155 63.9922 50.4949C63.997 50.6167 63.999 50.7523 63.999 50.9031L63.999 82.0564C63.985 83.3484 63.7412 84.2559 60.7412 84.8914L46.6855 87.7244Z",
  "M89.3145 8.27518C93.4285 7.40373 96 8.7352 96 10.3396V21.1844L78.0576 44.5008L95.999 66.7791V74.0574C95.9849 75.3488 95.7404 76.257 92.7412 76.8924L78.6855 79.7244C74.572 80.5957 72.0005 79.2651 72 77.6609V46.0262C72 45.8604 72.0032 45.6856 72.0088 45.5066C72.0039 45.3846 72.001 45.2486 72.001 45.0974V13.9431C72.015 12.6513 72.259 11.7437 75.2588 11.1082L89.3145 8.27518Z",
];

/** Tracing's ink: #141414 on light surfaces, #F5F5F5 on dark ones, as in the web app. */
function useBrandColor() {
  return useIsDark() ? "#F5F5F5" : "#141414";
}

/** The Tracing logo: the three-bar mark followed by the wordmark. */
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

/** Just the three-bar mark, for tight spaces. */
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
