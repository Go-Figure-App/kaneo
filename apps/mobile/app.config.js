// Go Figure overrides for the upstream Kaneo app. Upstream's app.json stays
// untouched so merges from usekaneo/kaneo never conflict; everything Go Figure
// changes about the app's identity lives here.
module.exports = ({ config }) => ({
	...config,
	name: "GF Kaneo",
	// Set both after running `eas init` under the Go Figure Expo account.
	owner: process.env.GOFIGURE_EXPO_OWNER,
	ios: {
		...config.ios,
		bundleIdentifier: "io.gofigureapp.kaneo",
	},
	android: {
		...config.android,
		package: "io.gofigureapp.kaneo",
	},
	extra: {
		...config.extra,
		eas: { projectId: process.env.GOFIGURE_EAS_PROJECT_ID },
	},
});
