/**
	* 调试器读盘 validate：对 data/storis-packages 正式包入口章跑引擎校验。
	*/
import { describe, expect, it } from "vitest";
import { validateStoryPackageOnDisk } from "@studio-v2/src/utils/server/packages/validate/validateStoryPackage.server";
import { readDiskPackageConf } from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";

describe("validateStoryPackageOnDisk (debugger S8-19)", () => {
	it("validates wrong_number_act1 without blocking errors", async () => {
		const packageConf = await readDiskPackageConf("wrong_number_act1");
		const report = await validateStoryPackageOnDisk("wrong_number_act1");
		expect(report.chapterId).toBe(packageConf.entryChapterId);
		expect(report.errors).toEqual([]);
	});

	it("validates golden_handoff without blocking errors", async () => {
		const packageConf = await readDiskPackageConf("golden_handoff");
		const report = await validateStoryPackageOnDisk("golden_handoff");
		expect(report.chapterId).toBe(packageConf.entryChapterId);
		expect(report.errors).toEqual([]);
	});
});
