/**
 * V2-VM-12：create_voicemail 已移出白名单；Executor 拒执、不写信箱槽。
 */
import { describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";
import type { CallSession } from "../../src/host/types.js";
import type { Effect } from "../../src/schema/outcome.js";

describe("create_voicemail executor reject (V2-VM-12)", () => {
	it("unsupported：failed 且 telephony.voicemails 无新写", async () => {
		const profile = PlayerProfileSchema.parse({
			schemaVersion: 1,
			userId: "u1",
			user: {
				userId: "u1",
				nickname: "测",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		});
		const session = {
			schemaVersion: 1,
			sessionId: "s1",
			userId: "u1",
			packageId: "pkg_demo",
			status: "executing_effects",
			startedAt: "2026-01-01T00:00:00.000Z",
			resolve: { agentId: "agent_a", cardId: "c1", entryMode: "user_dial" },
			frozenCard: { cardId: "c1", cardKind: "story", exits: [] },
			effectLedger: {},
			exitCandidates: [],
			outcome: { flags: {}, beats: {} },
		} as unknown as CallSession;
		const plan = await executeEffects(
			[
				{
					id: "vm1",
					effect: "create_voicemail",
					agentId: "agent_a",
					topicHint: "missed",
				} as Effect,
			],
			{ profile, session, nowIso: "2026-07-14T00:00:00.000Z" },
		);
		expect(plan.results[0]?.status).toBe("failed");
		expect(String(plan.results[0]?.error ?? "")).toMatch(/unsupported effect/i);
		const tel = profile.telephony as { voicemails?: unknown[] } | undefined;
		expect(tel?.voicemails ?? []).toEqual([]);
	});
});
