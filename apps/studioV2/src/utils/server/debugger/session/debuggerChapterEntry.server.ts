/**
	* 调试器章节入口解析：编辑器只传 chapterId，由 server 决定起始卡。
	*/
import { listDiskStoryPackages } from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import {
	chapterExists,
	readDiskChapterBundle,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import {
	isValidChapterId,
	packageFail,
} from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";
import type { DiskChapterBundle } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";

export type DebuggerChapterEntry = {
	/** 所属故事包容器 id；仅 server 解析定位用 */
	packageId: string;
	/** 调试章节 id；传给 Host simulate_start */
	chapterId: string;
	/** 章节 entryCardId；传给 Host simulate_start */
	cardId: string;
};

/** 从已读取的章节 bundle 中解析调试起始卡 */
export function projectDebuggerChapterEntry(
	packageId: string,
	bundle: DiskChapterBundle,
): DebuggerChapterEntry {
	const chapterId = bundle.conf.chapterId.trim();
	const cardId = bundle.conf.entryCardId?.trim() ?? "";
	if (cardId === "") {
		packageFail("VALIDATION_FAILED", "当前章节没有起始通话卡");
	}
	if (
		!bundle.conf.cards.some(function (card) {
			return card.cardId === cardId;
		})
	) {
		packageFail("VALIDATION_FAILED", "章节起始卡不在 conf.cards 中");
	}
	return { packageId, chapterId, cardId };
}

/** 按全局 chapterId 定位所属包并解析章节调试起始卡 */
export async function findDebuggerChapterEntry(
	chapterId: string,
): Promise<DebuggerChapterEntry> {
	const normalized = chapterId.trim();
	if (!isValidChapterId(normalized)) {
		packageFail("VALIDATION_FAILED", "invalid chapterId");
	}
	const packages = await listDiskStoryPackages();
	for (const summary of packages) {
		if (!(await chapterExists(summary.packageId, normalized))) continue;
		const bundle = await readDiskChapterBundle(summary.packageId, normalized);
		return projectDebuggerChapterEntry(summary.packageId, bundle);
	}
	packageFail("NOT_FOUND", `chapter not found: ${normalized}`);
}
