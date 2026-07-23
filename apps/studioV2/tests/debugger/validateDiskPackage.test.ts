/**
	* 调试器读盘 validate：对 data/storis-packages 正式包跑引擎校验。
	*/
import { describe, expect, it } from "vitest";
import { validateStoryPackageOnDisk } from "@studio-v2/src/utils/server/packages/validate/validateStoryPackage.server";

describe("validateStoryPackageOnDisk (debugger S8-19)", () => {
	it("validates wrong_number_act1 without blocking errors", async () => {
		const report = await validateStoryPackageOnDisk("wrong_number_act1");
		expect(report.packageId).toBe("wrong_number_act1");
		expect(report.errors).toEqual([]);
	});

	it("validates golden_handoff without blocking errors", async () => {
		const report = await validateStoryPackageOnDisk("golden_handoff");
		expect(report.packageId).toBe("golden_handoff");
		expect(report.errors).toEqual([]);
	});
});
