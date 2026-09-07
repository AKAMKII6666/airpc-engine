/**
	* L2 §8 集成链路：挂机登记任务 → 到点 tick → outbound.request → pending CallCard。
	*/
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineHost, PlayerProfile } from "@airpc/rpg-engine";
import {
	clearPluginLogEventsForTests,
	listPluginLogEvents,
} from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { scanAndLoadPlugins } from "@studio-v2/src/utils/server/plugins/load/scan/scanPlugins.server";
import { createPluginOutboundRequestHandler } from "@studio-v2/src/utils/server/plugins/api/outbound/requestOutbound.server";
import {
	clearPluginTasksForTests,
	drainDuePluginTasks,
	listPluginTasks,
	setPluginTaskClockForTests,
} from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);

function createProfile(): PlayerProfile {
	return {
		schemaVersion: 1,
		userId: "demo-user",
		user: {
			userId: "demo-user",
			nickname: "测试玩家",
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
}

function createHost(profile: PlayerProfile): EngineHost {
	const host = {
		async ensureProfile() {
			return profile;
		},
		async saveProfile() {},
	} satisfies Partial<EngineHost>;
	return host as unknown as EngineHost;
}

describe("plugin outbound integration", () => {
	let tmpRoot: string | undefined;

	afterEach(async function () {
		vi.useRealTimers();
		setPluginTaskClockForTests(null);
		clearPluginTasksForTests();
		clearPluginLogEventsForTests();
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("runs hangup registered task into outbound request with accepted CallCard", async function () {
		let now = 1_000;
		vi.useFakeTimers();
		vi.setSystemTime(now);
		setPluginTaskClockForTests(function () {
			return now;
		});
		tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-l2-outbound-"));
		await cp(
			path.join(repoRoot, "plugins", "demo-hangup-task"),
			path.join(tmpRoot, "demo-hangup-task"),
			{ recursive: true },
		);
		const profile = createProfile();
		const host = createHost(profile);

		const runtime = await scanAndLoadPlugins({
			pluginsRoot: tmpRoot,
			getHost() {
				return host;
			},
			requestOutbound: createPluginOutboundRequestHandler({
				getHost() {
					return host;
				},
			}),
		});
		expect(runtime.afterHangupHooks).toHaveLength(1);
		expect(runtime.outboundRequest).toHaveLength(1);

		await runtime.afterHangupHooks[0]!.run({
			userId: "demo-user",
			sessionId: "session-1",
			agentId: "lanxing",
			profile,
		});

		const tasks = await listPluginTasks({ pluginId: "demo-hangup-task" });
		expect(tasks).toHaveLength(1);
		now = 3_500;
		vi.setSystemTime(now);
		expect(await drainDuePluginTasks()).toBe(1);

		const events = listPluginLogEvents();
		expect(events.map((event) => event.type)).toEqual(
			expect.arrayContaining([
				"plugin.task_register",
				"plugin.task_tick",
				"plugin.outbound_request",
			]),
		);
		expect(
			events.some(function (event) {
				return event.type === "plugin.outbound_request" && event.accepted === true;
			}),
		).toBe(true);
		expect(profile.callCards.board.byAgent.lanxing?.pending).toMatchObject([
			{
				cardId: "demo_followup_card",
				chapterId: "demo_followup_chapter",
				agentId: "lanxing",
				status: "pending",
				entryMode: "outbound_auto",
			},
		]);
	});
});
