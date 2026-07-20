/**
 * outboundWindow 半开区间 + UserSchema 字段 + tick 门闩（细化修改 3）
 */
import { describe, expect, it } from "vitest";
import {
	UserSchema,
	isLocalHourInOutboundWindow,
	localHourFromIso,
	tickScheduleOnce,
	type PlayerProfile,
} from "../../src/index.js";

const baseUser = {
	userId: "u1",
	nickname: "小明",
	createdAt: "2026-07-13T00:00:00.000Z",
	updatedAt: "2026-07-13T00:00:00.000Z",
};

describe("outboundWindow helpers", () => {
	it("无窗不闸", () => {
		expect(isLocalHourInOutboundWindow(3, undefined)).toBe(true);
	});

	it("半开：9 ≤ h < 22", () => {
		const w = { from: 9, to: 22 };
		expect(isLocalHourInOutboundWindow(9, w)).toBe(true);
		expect(isLocalHourInOutboundWindow(21, w)).toBe(true);
		expect(isLocalHourInOutboundWindow(22, w)).toBe(false);
		expect(isLocalHourInOutboundWindow(3, w)).toBe(false);
	});

	it("localHourFromIso 可读小时", () => {
		const h = localHourFromIso("2026-07-20T15:30:00.000Z");
		expect(h).toBeGreaterThanOrEqual(0);
		expect(h).toBeLessThanOrEqual(23);
	});
});

describe("UserSchema.outboundWindow", () => {
	it("接受合法窗", () => {
		const ok = UserSchema.safeParse({
			...baseUser,
			outboundWindow: { from: 9, to: 22 },
		});
		expect(ok.success).toBe(true);
	});

	it("非法 to>24 拒收", () => {
		const bad = UserSchema.safeParse({
			...baseUser,
			outboundWindow: { from: 0, to: 25 },
		});
		expect(bad.success).toBe(false);
	});
});

function minimalProfile(
	outboundWindow: { from: number; to: number } | undefined,
): PlayerProfile {
	return {
		schemaVersion: 1,
		userId: "u1",
		user: {
			...baseUser,
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
					packageId: "__free__",
					fireAtMs: 500,
					status: "pending",
				},
			],
		},
		meta: {
			createdAt: baseUser.createdAt,
			updatedAt: baseUser.updatedAt,
		},
	} as PlayerProfile;
}

describe("tickScheduleOnce outboundWindow gate", () => {
	it("窗外 defer：仍 pending，不挂卡", () => {
		// 窗仅 10–11；用本地 3 点 ISO（Date 本地构造）保证窗外
		const profile = minimalProfile({ from: 10, to: 11 });
		const nightIso = new Date(2026, 6, 20, 3, 0, 0).toISOString();
		expect(isLocalHourInOutboundWindow(localHourFromIso(nightIso), {
			from: 10,
			to: 11,
		})).toBe(false);
		const fired = tickScheduleOnce(profile, nightIso);
		expect(fired).toHaveLength(0);
		const once = profile.schedule?.intents[0] as { status: string };
		expect(once.status).toBe("pending");
	});

	it("窗内可 fired", () => {
		const profile = minimalProfile({ from: 0, to: 24 });
		const fired = tickScheduleOnce(
			profile,
			new Date(2026, 6, 20, 12, 0, 0).toISOString(),
		);
		expect(fired).toHaveLength(1);
		const once = profile.schedule?.intents[0] as { status: string };
		expect(once.status).toBe("fired");
	});
});
