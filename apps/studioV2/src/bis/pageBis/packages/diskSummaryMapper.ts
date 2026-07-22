/**
	* 磁盘故事包摘要 → 列表/工作台 UI 投影。
	* 校验/保存态本步用保守默认；非 MOCK_STORY_PACKAGES。
	*/
import type { DiskStoryPackageSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 扫描摘要转列表卡片；description 本步留空，validation 默认 ok */
export function diskSummaryToPackageSummary(
	disk: DiskStoryPackageSummary,
): StoryPackageSummary {
	return {
		packageId: disk.packageId,
		title: disk.title,
		description: "",
		lastEditedAt: disk.lastEditedAt,
		cardCount: disk.cardCount,
		characterCount: disk.characterCount,
		assetCount: disk.assetCount,
		validation: "ok",
		saveState: "saved",
		lastExportedAt: null,
	};
}
