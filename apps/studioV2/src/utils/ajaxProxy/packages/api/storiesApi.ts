/**
	* 故事包 BFF：列 / 读 / 整包写 / 新建 / 只读 validate data/storis-packages（经 /api/stories）。
	* 列表与编辑器 UI 已接线；见 listStoryPackages_bis / loadStoryPackageForEditor。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DiskStoryPackageBundle,
	DiskStoryPackageSummary,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type {
	DiskPackageValidateResult,
	PutStoryPackageResult,
} from "@studio-v2/typeFiles/story/editor/validate/packageValidationDto";

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
	* PUT /api/stories/:packageId：整包落盘；服务端 validate，error 阻断并回滚。
	* 成功返回 bundle + validation（含可展示的 warning）。
	*/
export async function putDiskStoryPackage(
	packageId: string,
	bundle: DiskStoryPackageBundle,
): Promise<PutStoryPackageResult> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			conf: bundle.conf,
			cards: bundle.cards,
			layout: bundle.layout,
		}),
	});
	return parseStudioApiJson<PutStoryPackageResult>(res);
}

/**
	* POST /api/stories：新建最小包；packageId 可由客户端或服务端派生。
	*/
export async function postDiskStoryPackage(body: {
	title: string;
	description?: string;
	withStartCard?: boolean;
	packageId?: string;
}): Promise<DiskStoryPackageBundle> {
	const res = await fetch("/api/stories", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<DiskStoryPackageBundle>(res);
}

/**
	* GET /api/stories/:packageId/validate：对已落盘包只读 validate；不写盘、不 Host。
	*/
export async function fetchDiskStoryPackageValidation(
	packageId: string,
): Promise<DiskPackageValidateResult> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/validate`,
	);
	return parseStudioApiJson<DiskPackageValidateResult>(res);
}
