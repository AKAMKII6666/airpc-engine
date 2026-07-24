/**
	* 故事包 BFF：列 / 读 / 整包写 / 新建 / 删除 / 只读 validate / 导入 data/storis-packages（经 /api/stories）。
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
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";

export type StoriesListData = {
	packages: DiskStoryPackageSummary[];
	/**
		* 工作区首故事 packageId；与 workspace.json 对齐。
		* 旧响应缺字段时客户端按空串处理。
		*/
	startupPackageId?: string;
};

/** GET /api/stories：磁盘包列表 + 首故事指针 */
export async function fetchDiskStoryPackagesList(): Promise<StoriesListData> {
	const res = await fetch("/api/stories");
	return parseStudioApiJson<StoriesListData>(res);
}

/** GET /api/stories：仅包列表（兼容旧调用方） */
export async function fetchDiskStoryPackages(): Promise<
	DiskStoryPackageSummary[]
> {
	const data = await fetchDiskStoryPackagesList();
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
	* DELETE /api/stories/:packageId：删除包目录。
	* 服务端拒删首故事与最后一个包。
	*/
export async function deleteDiskStoryPackage(
	packageId: string,
): Promise<{ packageId: string }> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`, {
		method: "DELETE",
	});
	return parseStudioApiJson<{ packageId: string }>(res);
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

/** POST /api/stories/import 成功体 */
export type ImportStoryPackageResult = {
	packageId: string;
	bundle: DiskStoryPackageBundle;
	validation: ValidationReport;
};

/**
	* POST /api/stories/import：将交换文件整包写入 storis-packages。
	* 同名冲突抛 CONFLICT；校验失败抛 PACKAGE_VALIDATION_FAILED。
	*/
export async function postImportDiskStoryPackage(body: {
	packageId: string;
	conf: DiskStoryPackageBundle["conf"];
	cards: DiskStoryPackageBundle["cards"];
	layout?: DiskStoryPackageBundle["layout"];
}): Promise<ImportStoryPackageResult> {
	const res = await fetch("/api/stories/import", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<ImportStoryPackageResult>(res);
}
