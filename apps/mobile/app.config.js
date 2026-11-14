// Go Figure overrides for the upstream Tracing app. Upstream's app.json stays
// untouched so merges from usekaneo/kaneo never conflict; everything Go Figure
// changes about the app's identity lives here.
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
