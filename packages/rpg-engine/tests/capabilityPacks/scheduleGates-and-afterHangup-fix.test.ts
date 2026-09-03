/**
 * P1/P2 修复：scheduleGates 可关 + 运行时 schedule_gate 日志；afterHangup 失败可观测。
 */
import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	evaluateScheduleGatesDetailed,
	isEngineError,
	isLocalHourInOutboundWindow,
	localHourFromIso,
	mergeCapabilityPacks,
	OUTBOUND_WINDOW_GATE_ID,
	OUTBOUND_WINDOW_GATE_PACK_ID,
	outboundWindowGatePack,
	tickScheduleOnce,
	type AfterHangupHook,
	type FirstPartyPack,
	type PlayerProfile,
} from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";
import { shouldDeferOutboundForPlayerWindow } from "../../src/runtime/scheduleOutboundPending.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

function minimalProfile(
	outboundWindow: { from: number; to: number } | undefined,
): PlayerProfile {
	return {
		schemaVersion: 1,
		userId: "u1",
		user: {
			userId: "u1",
			nickname: "小明",
			createdAt: "2026-07-13T00:00:00.000Z",
			updatedAt: "2026-07-13T00:00:00.000Z",
			...(outboundWindow ? { outboundWindow } : {}),
		},
		characters: {},
		stories: {},
		callCards: { board: { byAgent: {} } },
		world: { lore: null, facts: [], knowledge: {} },
		schedule: {
			clockMs: 1000,
			intents: [
				{
					kind: "once",
					intentId: "i1",
					agentId: "npc_a",
					cardId: "c1",
					chapterId: "__free__",
					fireAtMs: 500,
					status: "pending",
				},
			],
		},
		meta: {
			createdAt: "2026-07-13T00:00:00.000Z",
			updatedAt: "2026-07-13T00:00:00.000Z",
		},
	} as PlayerProfile;
}

describe("scheduleGates switch-off and runtime logs", function () {
	it("显式空 gates：窗外也不 defer", function () {
		const profile = minimalProfile({ from: 10, to: 11 });
		const nightIso = new Date(2026, 6, 20, 3, 0, 0).toISOString();
		expect(
			isLocalHourInOutboundWindow(localHourFromIso(nightIso), {
				from: 10,
				to: 11,
			}),
		).toBe(false);
		expect(shouldDeferOutboundForPlayerWindow(profile, nightIso, [])).toBe(
			false,
		);
		const fired = tickScheduleOnce(profile, nightIso, null, {
			scheduleGates: [],
		});
		expect(fired).toHaveLength(1);
		const once = profile.schedule?.intents[0] as { status: string };
		expect(once.status).toBe("fired");
	});

	it("注入 gate 时 defer 产出 schedule_gate 事件", function () {
		const merged = mergeCapabilityPacks({
			packs: [outboundWindowGatePack],
			enabledPackIds: [OUTBOUND_WINDOW_GATE_PACK_ID],
		});
		const profile = minimalProfile({ from: 10, to: 11 });
		const nightIso = new Date(2026, 6, 20, 3, 0, 0).toISOString();
		const detailed = evaluateScheduleGatesDetailed(
			merged.scheduleGates,
			profile,
			nightIso,
			merged.packIdByGateId,
		);
		expect(detailed.defer).toBe(true);
		expect(detailed.events).toEqual([
			{
				type: "capabilityPack.schedule_gate",
				packId: OUTBOUND_WINDOW_GATE_PACK_ID,
				gateId: OUTBOUND_WINDOW_GATE_ID,
				allowed: false,
			},
		]);

		const logged: unknown[] = [];
		tickScheduleOnce(profile, nightIso, null, {
			scheduleGates: merged.scheduleGates,
			packIdByGateId: merged.packIdByGateId,
			onScheduleGateEvent(event) {
				logged.push(event);
			},
		});
		expect(logged).toEqual(detailed.events);
		const once = profile.schedule?.intents[0] as { status: string };
		expect(once.status).toBe("pending");
	});
});

describe("afterHangup failure observability", function () {
	it("钩子抛错记 afterHangup_failed 且仍可 endCall", async function () {
		const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-l1-ah-"));
		try {
			const dataRoot = path.join(tmpRoot, "data");
			await copyDataTree(dataSrc, dataRoot);
			const hook: AfterHangupHook = {
				hookId: "test.afterHangup.fail",
				run() {
					throw new Error("hook boom");
				},
			};
			const pack: FirstPartyPack = {
				manifest: {
					packId: "afterhangup-fail",
					packVersion: "0.0.1",
					apiVersion: 1,
					domains: ["realtime"],
				},
				contribute: {
					realtime: {
						"call.afterHangup": [hook],
					},
				},
			};
			const merged = mergeCapabilityPacks({ packs: [pack] });
			const host = createTestHost({
				persist: false,
				dataRoot,
				afterHangupHooks: merged.afterHangupHooks,
				packIdByHookId: merged.packIdByHookId,
			});
			await host.loadWorkspace(dataRoot);
			await host.ensureProfile("demo-user");
			const resolved = await host.resolveAsync("demo-user", {
				kind: "free_call",
				agentId: "lanxing",
			});
			if (isEngineError(resolved)) throw resolved;
			const session = await host.beginCall("demo-user", resolved, {
				channel: "manual",
			});
			if (isEngineError(session)) throw session;
			const ended = await host.endCall(session.sessionId, {
				flags: { answered_completed: true },
			});
			if (isEngineError(ended)) throw ended;
			const logs = host.getRecentLogs({ userId: "demo-user", limit: 50 });
			expect(
				logs.some(function (row) {
					return row.type === "capabilityPack.afterHangup_failed";
				}),
			).toBe(true);
		} finally {
			await rm(tmpRoot, { recursive: true, force: true });
		}
	});
});
