/**
	* 章列表 bis：拉章摘要、新建/删章、设入口章。
	* 经 ajaxProxy；UI 禁直引。
	*/
import {
	deleteDiskChapter,
	fetchDiskChapterSummaries,
	fetchDiskPackageConf,
	patchEntryChapterId,
	postDiskChapter,
} from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

/** GET /api/stories/:pkg/chapters */
export async function listChaptersForPackage(
	packageId: string,
): Promise<DiskChapterSummary[]> {
	const data = await fetchDiskChapterSummaries(packageId);
	return data.chapters;
}

/** GET packageConf 投影章列表页标题与入口章 */
export async function loadPackageMeta(packageId: string): Promise<{
	title: string;
	entryChapterId: string;
}> {
	const { packageConf } = await fetchDiskPackageConf(packageId);
	return {
		title: packageConf.title?.trim() ? packageConf.title : packageId,
		entryChapterId: packageConf.entryChapterId,
	};
}

/** POST 新建章 */
export async function createChapterOnDisk(input: {
	packageId: string;
	title: string;
}): Promise<{ chapterId: string }> {
	const chapterId = createStudioId("chapter", input.title);
	const bundle = await postDiskChapter({
		packageId: input.packageId,
		chapterId,
		title: input.title,
		withStartCard: true,
	});
	return { chapterId: bundle.conf.chapterId };
}

/** PATCH 设入口章 */
export async function setEntryChapter(input: {
	packageId: string;
	entryChapterId: string;
}): Promise<void> {
	await patchEntryChapterId(input.packageId, input.entryChapterId);
}

/** DELETE 删章（服务端拒删最后一章/入口章） */
export async function removeChapter(input: {
	packageId: string;
	chapterId: string;
}): Promise<void> {
	await deleteDiskChapter(input.packageId, input.chapterId);
}
