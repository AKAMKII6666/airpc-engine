/**
	* 故事章磁盘 validate：经 ContentPort 装章后调引擎 validatePackage。
	*/
import {
	validatePackage,
	type ValidationReport,
} from "@airpc/rpg-engine";
import { createFsContentPort } from "@studio-v2/engineIOModule/content/port/fsContentPort";
import { getStudioV2DataRoot } from "../../data/dataRoot.server";
import { getStudioV2EngineHost } from "../../host/engineHost.server";
import { readDiskPackageConf } from "../fs/package/packagesFs.server";

/**
	* 对已落盘 chapterId 跑引擎校验。
	*/
export async function validateStoryChapterOnDisk(
	chapterId: string,
): Promise<ValidationReport> {
	const workspaceKey = getStudioV2DataRoot();
	const content = createFsContentPort();
	const bundle = await content.loadPackageForValidate({
		workspaceKey,
		chapterId,
	});
	const host = await getStudioV2EngineHost();
	return validatePackage({
		bundle,
		workspaceKey,
		content,
		toolRegistry: host.getToolRegistry(),
	});
}

/**
	* 校验包入口章（兼容旧调用）。
	*/
export async function validateStoryPackageOnDisk(
	packageId: string,
): Promise<ValidationReport> {
	const packageConf = await readDiskPackageConf(packageId);
	return validateStoryChapterOnDisk(packageConf.entryChapterId);
}
