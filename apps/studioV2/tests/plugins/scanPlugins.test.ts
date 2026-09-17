/**
 * L2 插件扫描 / 合流 / 任务定时。
 */
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	clearPluginLogEventsForTests,
	listPluginLogEvents,
} from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { setStudioV2PluginsRootForTests } from "@studio-v2/src/utils/server/plugins/root/pluginsRoot.server";
import { scanAndLoadPlugins } from "@studio-v2/src/utils/server/plugins/load/scan/scanPlugins.server";
import {
	clearPluginTasksForTests,
	drainDuePluginTasks,
	registerPluginTask,
	setPluginTaskClockForTests,
} from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";
import { createMockPluginCapabilityApi } from "@airpc/pack-sdk";

afterEach(function () {
	setStudioV2PluginsRootForTests(null);
	clearPluginLogEventsForTests();
	clearPluginTasksForTests();
	setPluginTaskClockForTests(null);
});

describe("scanAndLoadPlugins", () => {
	it("loads enabled softExtra plugin and skips disabled", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "airpc-plugins-"));
		try {
			const enabledDir = path.join(root, "demo_on");
			await mkdir(enabledDir);
			await writeFile(
				path.join(enabledDir, "capability-packs.json"),
				JSON.stringify({
					id: "demo_on",
					version: "1.0.0",
					apiVersion: 1,
					enabled: true,
					realtime: {
						enabled: true,
						pipelines: [{ slot: "begin.softExtras", entry: "./soft.mjs" }],
					},
				}),
			);
			await writeFile(
				path.join(enabledDir, "soft.mjs"),
				`export default { enricherId: "e1", apply() { return "[p]"; } };\n`,
			);

			const offDir = path.join(root, "demo_off");
			await mkdir(offDir);
			await writeFile(
				path.join(offDir, "capability-packs.json"),
				JSON.stringify({
					id: "demo_off",
					version: "1.0.0",
					apiVersion: 1,
					enabled: false,
				}),
			);

			const badDir = path.join(root, "demo_bad");
			await mkdir(badDir);
			await writeFile(
				path.join(badDir, "capability-packs.json"),
				JSON.stringify({
					id: "demo_bad",
					version: "1.0.0",
					apiVersion: 2,
					enabled: true,
				}),
			);

			const result = await scanAndLoadPlugins({
				pluginsRoot: root,
				getHost: function () {
					throw new Error("host unused");
				},
			});

			expect(result.softExtraEnrichers).toHaveLength(1);
			expect(result.softExtraEnrichers[0]?.enricherId).toBe("e1");
			expect(result.skippedDisabled).toContain("demo_off");
			expect(result.failures.some((f) => f.reason.includes("manifest"))).toBe(
				true,
			);
			expect(result.loaded.some((l) => l.pluginId === "demo_on")).toBe(true);
			const types = listPluginLogEvents().map((e) => e.type);
			expect(types).toContain("plugin.scan");
			expect(types).toContain("plugin.load_ok");
			expect(types).toContain("plugin.load_skipped");
			expect(types).toContain("plugin.load_failed");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("wires tools.register into qualified external Registry contributions", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "airpc-plugin-tools-"));
		try {
			const dir = path.join(root, "weather-kit");
			await mkdir(dir);
			await writeFile(
				path.join(dir, "capability-packs.json"),
				JSON.stringify({
					id: "weather-kit",
					name: "天气能力",
					version: "1.0.0",
					apiVersion: 1,
					enabled: true,
					realtime: {
						enabled: true,
						pipelines: [{ slot: "tools.register", entry: "./tool.mjs" }],
					},
				}),
			);
			await writeFile(
				path.join(dir, "tool.mjs"),
				[
					`export default {`,
					`  localToolId: "lookup_weather",`,
					`  displayName: "查询天气",`,
					`  description: "查询指定城市的测试天气。",`,
					`  inputSchema: { type: "object", properties: { city: { type: "string" } }, required: ["city"], additionalProperties: false },`,
					`  allowedCardKinds: ["free", "story"],`,
					`  allowedInPlayback: false,`,
					`  async invoke(input) { return { city: input.args.city, sessionId: input.session.sessionId, pluginId: input.capabilities.pluginId }; }`,
					`};`,
					``,
				].join("\n"),
			);
			const result = await scanAndLoadPlugins({
				pluginsRoot: root,
				getHost: function () {
					throw new Error("host unused");
				},
			});
			expect(result.failures).toEqual([]);
			const tool = result.registeredTools[0];
			expect(tool).toMatchObject({
				definition: {
					toolId: "plugin:weather-kit:lookup_weather",
					behavior: "external",
				},
				source: {
					kind: "plugin",
					providerId: "weather-kit",
					displayName: "天气能力",
				},
				inheritByDefault: false,
			});
			await expect(tool?.invoke?.({
				sessionId: "s1",
				userId: "u1",
				agentId: "a1",
				chapterId: "c1",
				cardId: "card1",
				args: { city: "杭州" },
			})).resolves.toEqual({
				city: "杭州",
				sessionId: "s1",
				pluginId: "weather-kit",
			});
			expect(
				listPluginLogEvents().some(function (event) {
					return event.type === "plugin.load_skipped" &&
						"reason" in event &&
						event.reason === "slot_not_wired:tools.register";
				}),
			).toBe(false);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("pluginTaskScheduler", () => {
	it("fires due tasks", async () => {
		let now = 1_000;
		setPluginTaskClockForTests(function () {
			return now;
		});
		await registerPluginTask("p1", {
			taskId: "t1",
			fireAtMs: 1_500,
		});
		expect(await drainDuePluginTasks()).toBe(0);
		now = 2_000;
		expect(await drainDuePluginTasks()).toBe(1);
		expect(await drainDuePluginTasks()).toBe(0);
	});
});

describe("pack-sdk mock path leak guard sample", () => {
	it("mock api returns no filesystem paths", async () => {
		const api = createMockPluginCapabilityApi({
			pluginId: "x",
			users: {
				async list() {
					return [{ userId: "u1", displayName: "用户一" }];
				},
			},
		});
		const values = [
			await api.users.list(),
			await api.users.get("u1"),
			await api.characters.list(),
			await api.characters.get("c1"),
			await api.memory.query({ userId: "u1", characterId: "c1" }),
		];
		expect(JSON.stringify(values)).not.toMatch(
			/\/Users\/|\/data\/|data\/(?:users|characters|storis-packages)|\.sqlite/,
		);
	});
});
