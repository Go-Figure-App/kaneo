// Tracing native build identity. Keep the legacy URL scheme so existing
// mobile authorization links remain usable during the rename.
module.exports = ({ config }) => ({
  ...config,
  name: "Tracing",
  slug: "tracing",
  scheme: ["tracing", "kaneo"],
  owner: process.env.GOFIGURE_EXPO_OWNER || "gofigure",
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
    eas: {
      projectId:
        process.env.GOFIGURE_EAS_PROJECT_ID ||
        "4dfa905a-804d-4710-a412-559fc4428e21",
    },
  },
});
