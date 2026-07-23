/**
	* 整包写盘 + validatePackage 闸门：error 阻断并回滚到写前快照。
	* warning 不阻断；由调用方决定是否展示。
	*/
import {
	hasBlockingErrors,
	type ValidationReport,
} from "@airpc/rpg-engine";
import type { DiskStoryPackageBundle } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import { validateStoryPackageOnDisk } from "../validate/validateStoryPackage.server";
import { packageExists } from "./packagesFs.server";
import {
	readDiskStoryPackage,
	writeDiskStoryPackage,
} from "./packagesFs.server";

export type WriteValidatedPackageInput = {
	conf: unknown;
	cards: unknown[];
	layout?: unknown | null;
};

export type WriteValidatedPackageOk = {
	ok: true;
	bundle: DiskStoryPackageBundle;
	report: ValidationReport;
};

export type WriteValidatedPackageFail = {
	ok: false;
	/** 写盘后校验出的报告；磁盘已回滚到写前（若有快照） */
	report: ValidationReport;
	/** true 表示已恢复写前整包；false 表示写前无包（极少见于编辑器 PUT） */
	restored: boolean;
};

/**
	* 先写盘再 validate；有 blocking error 则恢复写前内容并返回 fail。
	* 不在此抛错，便于 route 把 report 放进 apiFail.details。
	*/
export async function writeValidatedDiskStoryPackage(
	packageId: string,
	bundle: WriteValidatedPackageInput,
): Promise<WriteValidatedPackageOk | WriteValidatedPackageFail> {
	let previous: DiskStoryPackageBundle | null = null;
	if (await packageExists(packageId)) {
		previous = await readDiskStoryPackage(packageId);
	}

	const written = await writeDiskStoryPackage(packageId, bundle);
	const report = await validateStoryPackageOnDisk(packageId);

	if (hasBlockingErrors(report)) {
		if (previous) {
			await writeDiskStoryPackage(packageId, {
				conf: previous.conf,
				cards: previous.cards,
				layout: previous.layout,
			});
		}
		return { ok: false, report, restored: previous !== null };
	}

	return { ok: true, bundle: written, report };
}
