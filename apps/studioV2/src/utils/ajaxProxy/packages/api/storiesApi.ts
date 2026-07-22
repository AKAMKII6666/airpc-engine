/**
	* 故事包 BFF：列 / 读 / 整包写 data/storis-packages（经 /api/stories）。
	* 列表与编辑器 UI 已接线；见 listStoryPackages_bis / loadStoryPackageForEditor。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DiskStoryPackageBundle,
	DiskStoryPackageSummary,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";

export type StoriesListData = {
	packages: DiskStoryPackageSummary[];
};

/** GET /api/stories：磁盘包列表 */
export async function fetchDiskStoryPackages(): Promise<
	DiskStoryPackageSummary[]
> {
	const res = await fetch("/api/stories");
	const data = await parseStudioApiJson<StoriesListData>(res);
	return data.packages;
}

/** GET /api/stories/:packageId：整包（conf + cards + layout） */
export async function fetchDiskStoryPackage(
	packageId: string,
): Promise<DiskStoryPackageBundle> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`);
	return parseStudioApiJson<DiskStoryPackageBundle>(res);
}

/**
	* PUT /api/stories/:packageId：整包落盘；响应为写后回读形状。
	*/
export async function putDiskStoryPackage(
	packageId: string,
	bundle: DiskStoryPackageBundle,
): Promise<DiskStoryPackageBundle> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			conf: bundle.conf,
			cards: bundle.cards,
			layout: bundle.layout,
		}),
	});
	return parseStudioApiJson<DiskStoryPackageBundle>(res);
}
