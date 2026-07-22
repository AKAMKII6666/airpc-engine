/**
	* 故事包列表真源：GET /api/stories → data/storis-packages。
	*/
import { diskSummaryToPackageSummary } from "@studio-v2/src/bis/pageBis/packages/diskSummaryMapper";
import { fetchDiskStoryPackages } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 磁盘扫描并投影为工作台/列表摘要 */
export async function listStoryPackagesFromDisk(): Promise<
	StoryPackageSummary[]
> {
	const disk = await fetchDiskStoryPackages();
	return disk.map(diskSummaryToPackageSummary);
}
