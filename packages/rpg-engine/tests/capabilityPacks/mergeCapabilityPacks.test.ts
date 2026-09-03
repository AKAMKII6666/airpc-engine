/**
 * L1-B：mergeCapabilityPacks — 重复 id、关包、日志事件（T1–T2）。
 */
import { describe, expect, it } from "vitest";
import {
	mergeCapabilityPacks,
} from "../../src/index.js";
import { samplePack } from "./samplePackFixture.js";

describe("mergeCapabilityPacks L1-B unit", function () {
	it("T1 rejects duplicate packId", function () {
		expect(function () {
			mergeCapabilityPacks({
				packs: [samplePack("dup", "a"), samplePack("dup", "b")],
			});
		}).toThrow(/duplicate capability pack id/);
	});

	it("T2 rejects duplicate providerId", function () {
		expect(function () {
			mergeCapabilityPacks({
				packs: [
					samplePack("p1", "same-provider"),
					samplePack("p2", "same-provider"),
				],
			});
		}).toThrow(/duplicate prompt provider id/);
	});

	it("emits merge and disabled events; disabled pack providers omitted", function () {
		const merged = mergeCapabilityPacks({
			packs: [
				samplePack("keep", "pack.keep"),
				samplePack("drop", "pack.drop"),
			],
			enabledPackIds: ["keep"],
		});
		expect(merged.enabledPackIds).toEqual(["keep"]);
		expect(merged.disabledPackIds).toEqual(["drop"]);
		expect(merged.promptProviderRegistry.getProviderIds()).toContain(
			"pack.keep",
		);
		expect(merged.promptProviderRegistry.getProviderIds()).not.toContain(
			"pack.drop",
		);
		expect(merged.events).toEqual(
			expect.arrayContaining([
				{ type: "capabilityPack.disabled", packId: "drop" },
				{
					type: "capabilityPack.merge",
					packIds: ["keep"],
					apiVersion: 1,
				},
			]),
		);
	});
});
