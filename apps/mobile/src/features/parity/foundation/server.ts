import Constants from "expo-constants";

export const FIXED_SERVER_URL: string =
  Constants.expoConfig?.extra?.parityServerUrl;
if (!FIXED_SERVER_URL)
  throw new Error("The Go Figure build is missing parityServerUrl");
