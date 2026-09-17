/**
 * Studio V2 E2E owner process.
 *
 * Every spawned process is registered and terminated in finally. The suite
 * runs against a disposable workspace and refuses worktree mutations.
 */
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import {
	cp,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const studioRoot = path.join(repoRoot, "apps/studioV2");
const requestedTests = process.argv.slice(2);
const owned = [];
let interrupted = false;
let shutdownPromise = null;

function worktreeFingerprint() {
	return execFileSync(
		"git",
		["status", "--porcelain=v1", "--untracked-files=all"],
		{ cwd: repoRoot, encoding: "utf8" },
	);
}

async function allocatePort() {
	const server = createServer();
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (address == null || typeof address === "string") {
		server.close();
		throw new Error("failed to allocate an E2E port");
	}
	const port = address.port;
	await new Promise((resolve) => server.close(resolve));
	return port;
}

function spawnOwned(label, command, args, options) {
	const child = spawn(command, args, {
		...options,
		detached: process.platform !== "win32",
	});
	owned.push({ label, child });
	return child;
}

function waitForExit(child) {
	return new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code, signal) => resolve({ code, signal }));
	});
}

async function terminateOwned(entry) {
	const { child } = entry;
	const signalTarget = process.platform === "win32" ? child.pid : -child.pid;
	const leaderAlreadyExited = child.exitCode != null || child.signalCode != null;
	try {
		process.kill(signalTarget, "SIGTERM");
	} catch (error) {
		if (error?.code !== "ESRCH") throw error;
		return;
	}
	if (leaderAlreadyExited) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		try {
			process.kill(signalTarget, "SIGKILL");
		} catch (error) {
			if (error?.code !== "ESRCH") throw error;
		}
		return;
	}
	const exited = await Promise.race([
		waitForExit(child).then(() => true),
		new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
	]);
	if (exited) return;
	try {
		process.kill(signalTarget, "SIGKILL");
	} catch (error) {
		if (error?.code !== "ESRCH") throw error;
	}
}

async function terminateAllOwned() {
	for (let index = owned.length - 1; index >= 0; index -= 1) {
		await terminateOwned(owned[index]);
	}
}

function assertNotInterrupted() {
	if (!interrupted) return;
	throw new Error("E2E run interrupted");
}

async function waitForReady(url, serverProcess) {
	const deadline = Date.now() + 45_000;
	while (Date.now() < deadline) {
		if (serverProcess.exitCode != null) {
			throw new Error(`Studio exited before readiness (${serverProcess.exitCode})`);
		}
		try {
			const response = await fetch(url);
			if (response.ok) return;
		} catch {
			// Startup connection failures are expected until Next is listening.
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(`Studio readiness timed out: ${url}`);
}

async function prepareWorkspace(tempRoot) {
	const dataRoot = path.join(tempRoot, "workspace/data");
	await mkdir(dataRoot, { recursive: true });
	for (const name of [
		"assets",
		"characters",
		"storis-packages",
		"tools",
	]) {
		await cp(path.join(repoRoot, "data", name), path.join(dataRoot, name), {
			recursive: true,
		});
	}
	await mkdir(path.join(dataRoot, "memory"), { recursive: true });
	await cp(
		path.join(repoRoot, "data/workspace.json"),
		path.join(dataRoot, "workspace.json"),
	);
	await mkdir(path.join(dataRoot, "users/demo-user"), { recursive: true });
	await writeFile(
		path.join(dataRoot, "users/index.json"),
		JSON.stringify({
			schemaVersion: 1,
			users: [{
				userId: "demo-user",
				nickname: "E2E Player",
				createdAt: "2026-01-01T00:00:00.000Z",
			}],
		}, null, 2) + "\n",
	);
	await writeFile(
		path.join(dataRoot, "users/demo-user/profile.save.json"),
		JSON.stringify({
			schemaVersion: 1,
			userId: "demo-user",
			user: {
				userId: "demo-user",
				nickname: "E2E Player",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			characters: { lanxing: { agentId: "lanxing", unlocked: true } },
			stories: {},
			callCards: { board: { byAgent: {} } },
			telephony: { voicemailGenStack: [] },
			world: { facts: [], knowledge: {} },
			schedule: { clockMs: 0, intents: [] },
			research: { commitments: [] },
		}, null, 2) + "\n",
	);
	await writeFile(path.join(dataRoot, "post-call-jobs.json"), '{"jobs":[]}\n');
	const pluginsRoot = path.join(tempRoot, "workspace/plugins");
	const pluginDir = path.join(pluginsRoot, "e2e-tools");
	await mkdir(pluginDir, { recursive: true });
	await writeFile(
		path.join(pluginDir, "capability-packs.json"),
		JSON.stringify({
			id: "e2e-tools",
			name: "E2E 工具插件",
			version: "1.0.0",
			apiVersion: 1,
			enabled: true,
			realtime: {
				enabled: true,
				pipelines: [{ slot: "tools.register", entry: "./echo.mjs" }],
			},
		}, null, 2) + "\n",
	);
	await writeFile(
		path.join(pluginDir, "echo.mjs"),
		[
			"export default {",
			'  localToolId: "echo",',
			'  displayName: "E2E 回声",',
			'  description: "回显 E2E 参数。",',
			'  inputSchema: { type: "object", properties: { value: { type: "string" } }, required: ["value"], additionalProperties: false },',
			'  allowedCardKinds: ["free", "story"],',
			"  allowedInPlayback: false,",
			"  async invoke(input) { return { value: input.args.value, pluginId: input.capabilities.pluginId, sessionId: input.session.sessionId }; }",
			"};",
			"",
		].join("\n"),
	);
	await writeFile(path.join(tempRoot, "workspace/.airpc-e2e-workspace"), "1\n");
	return dataRoot;
}

async function main() {
	const nextEnvPath = path.join(studioRoot, "next-env.d.ts");
	const nextEnvBefore = await readFile(nextEnvPath, "utf8");
	const fingerprint = worktreeFingerprint();
	const runId = `${new Date().toISOString().replaceAll(":", "-")}-${process.pid}`;
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-studio-e2e-"));
	const e2eDistRoot = path.join(studioRoot, `.next-e2e-${runId}`);
	const artifactRoot = path.join(repoRoot, ".e2e-artifacts", runId);
	await mkdir(artifactRoot, { recursive: true });
	const serverLog = createWriteStream(path.join(artifactRoot, "studio.log"));
	let exitCode = 1;

	try {
		const dataRoot = await prepareWorkspace(tempRoot);
		assertNotInterrupted();
		const port = await allocatePort();
		assertNotInterrupted();
		const baseURL = `http://127.0.0.1:${port}`;
		const serverEnv = {
			...process.env,
			AIRPC_STUDIO_DATA_ROOT: dataRoot,
			AIRPC_E2E: "1",
			AIRPC_NEXT_DIST_DIR: path.basename(e2eDistRoot),
		};
		const build = spawnOwned(
			"studio-build",
			process.execPath,
			[
				path.join(repoRoot, "node_modules/next/dist/bin/next"),
				"build",
				"--webpack",
			],
			{
				cwd: studioRoot,
				env: serverEnv,
				stdio: ["ignore", serverLog, serverLog],
			},
		);
		const buildResult = await waitForExit(build);
		if (buildResult.code !== 0) {
			throw new Error(
				`Studio build failed (code=${buildResult.code}, signal=${buildResult.signal ?? "none"})`,
			);
		}
		assertNotInterrupted();
		const server = spawnOwned(
			"studio",
			process.execPath,
			[
				path.join(repoRoot, "node_modules/next/dist/bin/next"),
				"start",
				"--hostname",
				"127.0.0.1",
				"--port",
				String(port),
			],
			{
				cwd: studioRoot,
				env: serverEnv,
				stdio: ["ignore", serverLog, serverLog],
			},
		);
		await waitForReady(`${baseURL}/api/stories`, server);
		assertNotInterrupted();

		const playwright = spawnOwned(
			"playwright",
			process.execPath,
			[
				path.join(repoRoot, "node_modules/@playwright/test/cli.js"),
				"test",
				"--config",
				path.join(studioRoot, "playwright.config.ts"),
				...requestedTests,
			],
			{
				cwd: studioRoot,
				env: {
					...process.env,
					PLAYWRIGHT_BASE_URL: baseURL,
					AIRPC_E2E_ARTIFACT_DIR: path.join(artifactRoot, "playwright"),
				},
				stdio: "inherit",
			},
		);
		const result = await waitForExit(playwright);
		if (result.code !== 0) {
			throw new Error(
				`Playwright failed (code=${result.code}, signal=${result.signal ?? "none"})`,
			);
		}
		exitCode = 0;
	} finally {
		if (!shutdownPromise) shutdownPromise = terminateAllOwned();
		await shutdownPromise;
		serverLog.end();
		await rm(tempRoot, { recursive: true, force: true });
		await rm(e2eDistRoot, { recursive: true, force: true });
		// Next rewrites this generated tracked declaration differently for build/dev.
		await writeFile(nextEnvPath, nextEnvBefore, "utf8");
		if (worktreeFingerprint() !== fingerprint) {
			exitCode = 1;
			throw new Error("E2E run modified the repository worktree");
		}
	}
	if (interrupted) process.exitCode = 130;
	else process.exitCode = exitCode;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.once(signal, () => {
		interrupted = true;
		if (!shutdownPromise) shutdownPromise = terminateAllOwned();
	});
}

await main();
