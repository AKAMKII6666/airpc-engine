/**
	* 故事包列表真源：GET /api/stories → data/storis-packages + 首故事指针。
	*/
import {
	diskSummaryToPackageSummary,
	sortPackagesStartupFirst,
} from "@studio-v2/src/bis/pageBis/packages/diskSummaryMapper";
import { fetchDiskStoryPackagesList } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 磁盘扫描并投影为工作台/列表摘要；首故事置顶 */
export async function listStoryPackagesFromDisk(): Promise<
	StoryPackageSummary[]
> {
	const data = await fetchDiskStoryPackagesList();
	const startupPackageId =
		typeof data.startupPackageId === "string"
			? data.startupPackageId.trim()
			: "";
	const mapped = data.packages.map(function (disk) {
		return diskSummaryToPackageSummary(disk, startupPackageId);
	});
	return sortPackagesStartupFirst(mapped);
}
