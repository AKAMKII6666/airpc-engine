import { defineConfig } from "@playwright/test";

const browserPath =
	process.env.AIRPC_E2E_BROWSER_PATH ??
	(process.platform === "darwin"
		? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
		: undefined);

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	// Next dev cold-compiles the large Studio graph on the first page load.
	timeout: 120_000,
	expect: { timeout: 30_000 },
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL,
		launchOptions: browserPath ? { executablePath: browserPath } : undefined,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off",
	},
	reporter: [["line"]],
	outputDir:
		process.env.AIRPC_E2E_ARTIFACT_DIR ?? "../../.e2e-artifacts/playwright",
});
