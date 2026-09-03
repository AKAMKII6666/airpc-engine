/**
 * L1-A：槽点名与 FirstPartyPack 契约可编译、与 25 §5 同名。
 */
import { describe, expect, it } from "vitest";
import {
	BACKGROUND_SLOTS,
	isBackgroundSlot,
	isRealtimeSlot,
	REALTIME_SLOTS,
	type FirstPartyPack,
} from "../../src/index.js";

describe("capabilityPacks L1-A slots and pack contract", function () {
	it("realtime slots match 25 §5 names", function () {
		expect([...REALTIME_SLOTS]).toEqual([
			"compose.providers",
			"begin.softExtras",
			"tools.register",
			"effects.register",
			"dialogue.events",
			"call.afterHangup",
			"commit.context",
			"commit.extract",
		]);
	});

	it("background slots match 25 §5 names", function () {
		expect([...BACKGROUND_SLOTS]).toEqual([
			"tasks.register",
			"tasks.onTick",
			"outbound.prepare",
			"outbound.request",
			"schedule.gates",
			"schedule.topic",
		]);
	});

	it("slot guards accept listed names only", function () {
		expect(isRealtimeSlot("compose.providers")).toBe(true);
		expect(isRealtimeSlot("settings.plugin")).toBe(false);
		expect(isBackgroundSlot("schedule.gates")).toBe(true);
		expect(isBackgroundSlot("compose.providers")).toBe(false);
	});

	it("FirstPartyPack shape is constructible for merge skeleton", function () {
		const pack: FirstPartyPack = {
			manifest: {
				packId: "example-skeleton",
				packVersion: "0.0.0",
				apiVersion: 1,
				domains: ["realtime"],
			},
			contribute: {
				realtime: {
					"compose.providers": [],
				},
			},
		};
		expect(pack.manifest.packId).toBe("example-skeleton");
		expect(pack.contribute.realtime?.["compose.providers"]).toEqual([]);
	});
});
