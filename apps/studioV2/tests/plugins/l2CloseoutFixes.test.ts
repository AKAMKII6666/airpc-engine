/**
	* L2 收口补完回归：冲突拒载 / session not_wired / 路径 / 任务隔离 / 外呼拒绝。
	*/
import { mkdir, mkdtemp, symlink, writeFile, rm, access } from "node:fs/promises";
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
	assembleCapabilityRuntime,
	resetAssembledCapabilityRuntimeForTests,
} from "@studio-v2/src/utils/server/plugins/assemble/assembleWithPlugins.server";
import { createPluginCapabilityApi } from "@studio-v2/src/utils/server/plugins/api/createPluginCapabilityApi.server";
import { createPluginOutboundRequestHandler } from "@studio-v2/src/utils/server/plugins/api/outbound/requestOutbound.server";
import { assertEntryInsidePackageRoot } from "@studio-v2/src/utils/server/plugins/load/entry/loadPluginEntry.server";
import {
	cancelPluginTask,
	clearPluginTasksForTests,
	getPluginTask,
	registerPluginTask,
} from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";
import type { EngineHost, PlayerProfile } from "@airpc/rpg-engine";

afterEach(function () {
	setStudioV2PluginsRootForTests(null);
	clearPluginLogEventsForTests();
	clearPluginTasksForTests();
	resetAssembledCapabilityRuntimeForTests();
});

function createHost(profile: PlayerProfile): EngineHost {
	const host = {
		async ensureProfile() {
			return profile;
		},
		async saveProfile() {},
		getMemoryPort() {
			return null;
		},
	} satisfies Partial<EngineHost>;
	return host as unknown as EngineHost;
}

describe("L2 closeout: L1/L2 id conflict", () => {
	it("rejects L2 pluginId that equals L1 packId before entry runs", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "airpc-l2-conflict-"));
		const marker = path.join(root, "entry-ran.txt");
		try {
			const dir = path.join(root, "core-compose");
			await mkdir(dir);
			await writeFile(
				path.join(dir, "capability-packs.json"),
				JSON.stringify({
					id: "core-compose",
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
				path.join(dir, "soft.mjs"),
				[
					`import { writeFileSync } from "node:fs";`,
					`writeFileSync(${JSON.stringify(marker)}, "ran");`,
					`export default { enricherId: "conflict_soft", apply() { return "[x]"; } };`,
					``,
				].join("\n"),
			);
			const runtime = await assembleCapabilityRuntime({
				pluginsRoot: root,
				forceReload: true,
				getHost: function () {
					throw new Error("unused");
				},
			});
			expect(
				runtime.pluginFailures.some(function (f) {
					return (
						f.pluginId === "core-compose" &&
						String(f.reason).includes("conflict_l1_pack_id")
					);
				}),
			).toBe(true);
			expect(
				runtime.loadedPlugins.some(function (l) {
					return l.pluginId === "core-compose";
				}),
			).toBe(false);
			expect(
				runtime.softExtraEnrichers.some(function (e) {
					return e.enricherId === "conflict_soft";
				}),
			).toBe(false);
			await expect(pathExistsMarker(marker)).resolves.toBe(false);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

async function pathExistsMarker(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

describe("L2 closeout: session not_wired", () => {
	it("marks injectSpeakable failed", async () => {
		const api = createPluginCapabilityApi({
			pluginId: "p",
			getHost: function () {
				throw new Error("unused");
			},
		});
		await expect(api.session.injectSpeakable("hi")).rejects.toThrow(/not_wired/);
		const call = listPluginLogEvents().find(function (e) {
			return e.type === "plugin.api_call" && e.method === "session.injectSpeakable";
		});
		expect(call && "ok" in call ? call.ok : undefined).toBe(false);
	});

	it("marks subscribeEvents failed with api_call log", () => {
		const api = createPluginCapabilityApi({
			pluginId: "p",
			getHost: function () {
				throw new Error("unused");
			},
		});
		expect(function () {
			api.session.subscribeEvents(function () {});
		}).toThrow(/not_wired/);
		const call = listPluginLogEvents().find(function (e) {
			return e.type === "plugin.api_call" && e.method === "session.subscribeEvents";
		});
		expect(call && "ok" in call ? call.ok : undefined).toBe(false);
	});
});

describe("L2 closeout: outbound rejects missing card", () => {
	it("requires cardId and chapterId", async () => {
		const profile: PlayerProfile = {
			schemaVersion: 1,
			userId: "u1",
			user: {
				userId: "u1",
				nickname: "n",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			characters: {},
			stories: {},
			callCards: { board: { byAgent: {} } },
			world: { lore: null, facts: [], knowledge: {} },
			schedule: { clockMs: 0, intents: [] },
			research: { commitments: [] },
		};
		const handler = createPluginOutboundRequestHandler({
			getHost: async function () {
				return createHost(profile);
			},
		});
		const denied = await handler({
			userId: "u1",
			characterId: "c1",
		});
		expect(denied.accepted).toBe(false);
		expect(denied.reason).toMatch(/cardId_required|chapterId_required/);
	});
});

describe("L2 closeout: entry path escape", () => {
	it("rejects symlink outside package root", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "airpc-l2-symlink-"));
		try {
			const pkg = path.join(root, "pkg");
			const outside = path.join(root, "outside.mjs");
			await mkdir(pkg);
			await writeFile(outside, "export default {};\n");
			const link = path.join(pkg, "evil.mjs");
			await symlink(outside, link);
			await expect(
				assertEntryInsidePackageRoot({
					packageRoot: pkg,
					absoluteEntryPath: link,
				}),
			).rejects.toThrow(/entry_outside_package_root/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("L2 closeout: task ownership", () => {
	it("forbids cross-plugin cancel", async () => {
		await registerPluginTask("a", { taskId: "shared", fireAtMs: 9_999 });
		await expect(cancelPluginTask("b", "shared")).rejects.toThrow(
			/task_not_found_or_forbidden/,
		);
		expect(await getPluginTask("a", "shared")).not.toBeNull();
	});

	it("list is scoped to calling plugin only", async () => {
		await registerPluginTask("a", { taskId: "t-a", fireAtMs: 9_999 });
		await registerPluginTask("b", { taskId: "t-b", fireAtMs: 9_999 });
		const apiA = createPluginCapabilityApi({
			pluginId: "a",
			getHost: function () {
				throw new Error("unused");
			},
		});
		const listed = await apiA.tasks.list({ pluginId: "b" });
		expect(listed.map((t) => t.taskId)).toEqual(["t-a"]);
	});
});

describe("L2 closeout: provider conflict isolated", () => {
	it("rejects L2 providerId clash without crashing assemble", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "airpc-l2-provider-"));
		try {
			const dir = path.join(root, "dup-provider");
			await mkdir(dir);
			await writeFile(
				path.join(dir, "capability-packs.json"),
				JSON.stringify({
					id: "dup-provider",
					version: "1.0.0",
					apiVersion: 1,
					enabled: true,
					realtime: {
						enabled: true,
						pipelines: [
							{ slot: "compose.providers", entry: "./provider.mjs" },
						],
					},
				}),
			);
			// core-compose 默认链含 user_identity 等；用一个常见 id 若未知则用 soft + 手动 reserved 测
			await writeFile(
				path.join(dir, "provider.mjs"),
				`export default { providerId: "base.card_context", apply() { return {}; } };\n`,
			);
			const runtime = await assembleCapabilityRuntime({
				pluginsRoot: root,
				forceReload: true,
				getHost: function () {
					throw new Error("unused");
				},
			});
			expect(
				runtime.pluginFailures.some(function (f) {
					return (
						f.pluginId === "dup-provider" &&
						String(f.reason).includes("conflict_l1_provider_id")
					);
				}),
			).toBe(true);
			// 装配本身仍应返回（L1 providers 仍在）
			expect(runtime.promptProviderRegistry.providers.length).toBeGreaterThan(0);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("L2 closeout: scan root io", () => {
	it("records non-ENOENT scan failures", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "airpc-l2-scanio-"));
		const asFile = path.join(root, "not-a-dir");
		try {
			await writeFile(asFile, "x");
			const result = await scanAndLoadPlugins({
				pluginsRoot: asFile,
				getHost: function () {
					throw new Error("unused");
				},
			});
			expect(result.scanRootError).toMatch(/scan_root_io/);
			expect(result.failures.some((f) => f.reason.includes("scan_root_io"))).toBe(
				true,
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
