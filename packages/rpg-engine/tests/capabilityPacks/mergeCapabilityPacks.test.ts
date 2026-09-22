/**
 * L1-B：mergeCapabilityPacks — 重复 id、关包、日志事件（T1–T2）。
 */
import { describe, expect, it } from "vitest";
import { mergeCapabilityPacks } from "../../src/index.js";
import { samplePack } from "./samplePackFixture.js";
import {
	assertDisabledPackMergeEvents,
	assertNormalizedL1ToolRegister,
} from "./mergeCapabilityPacks.helpers.js";

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
		assertDisabledPackMergeEvents();
	});

	it("normalizes L1 tools.register contributions into Registry entries", function () {
		assertNormalizedL1ToolRegister();
	});
});
