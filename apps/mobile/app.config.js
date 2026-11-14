// Tracing native build identity. Keep the legacy URL scheme so existing
// mobile authorization links remain usable during the rename.
module.exports = ({ config }) => ({
  ...config,
  name: "Tracing",
  slug: "tracing",
  scheme: ["tracing", "kaneo"],
  // Set both after running `eas init` under the Go Figure Expo account.
  owner: process.env.GOFIGURE_EXPO_OWNER,
  ios: {
    ...config.ios,
    bundleIdentifier: "io.gofigureapp.tracing",
  },
  android: {
    ...config.android,
    package: "io.gofigureapp.tracing",
  },
  extra: {
    ...config.extra,
    parityServerUrl:
      process.env.GOFIGURE_LOCAL_SERVER_URL || "https://tracing.gofigureapp.io",
    eas: { projectId: process.env.GOFIGURE_EAS_PROJECT_ID },
  },
});
