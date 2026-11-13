import Constants from "expo-constants";
import { normalizeServerUrl } from "./normalize-server-url";

const configuredUrl = Constants.expoConfig?.extra?.parityServerUrl;
if (typeof configuredUrl !== "string" || !configuredUrl.trim())
  throw new Error("The Go Figure build is missing parityServerUrl");
export const FIXED_SERVER_URL = normalizeServerUrl(configuredUrl);
