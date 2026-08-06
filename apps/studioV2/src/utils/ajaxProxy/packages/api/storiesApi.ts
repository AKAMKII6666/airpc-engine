/**
	* 故事包 BFF：列 / 读 / 写章 / 新建 / 删 / validate / 导入。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type {
	DiskChapterBundle,
	DiskChapterSummary,
	DiskPackageContainer,
	DiskStoryPackageBundle,
	DiskStoryPackageSummary,
	PackageConf,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type {
	DiskPackageValidateResult,
	PutStoryPackageResult,
} from "@studio-v2/typeFiles/story/editor/validate/packageValidationDto";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";

export type StoriesListData = {
	packages: DiskStoryPackageSummary[];
};

export async function fetchDiskStoryPackagesList(): Promise<StoriesListData> {
	const res = await fetch("/api/stories");
	return parseStudioApiJson<StoriesListData>(res);
}

export async function fetchDiskStoryPackages(): Promise<
	DiskStoryPackageSummary[]
> {
	const data = await fetchDiskStoryPackagesList();
	return data.packages;
}

export async function fetchDiskPackageConf(
	packageId: string,
): Promise<{ packageConf: PackageConf }> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`);
	return parseStudioApiJson<{ packageConf: PackageConf }>(res);
}

export async function fetchDiskPackageContainer(
	packageId: string,
): Promise<DiskPackageContainer> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}?view=container`,
	);
	return parseStudioApiJson<DiskPackageContainer>(res);
}

/** GET 章 bundle（编辑器打开） */
export async function fetchDiskChapterBundle(
	packageId: string,
	chapterId: string,
): Promise<DiskChapterBundle> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(chapterId)}`,
	);
	return parseStudioApiJson<DiskChapterBundle>(res);
}

/** @deprecated 读入口章 */
export async function fetchDiskStoryPackage(
	packageId: string,
): Promise<DiskStoryPackageBundle> {
	const list = await fetchDiskStoryPackagesList();
	const pkg = list.packages.find(function (p) {
		return p.packageId === packageId;
	});
	const chapterId = pkg?.entryChapterId ?? packageId;
	return fetchDiskChapterBundle(packageId, chapterId);
}

export async function putDiskChapterBundle(
	packageId: string,
	chapterId: string,
	bundle: DiskChapterBundle,
): Promise<PutStoryPackageResult> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(chapterId)}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				conf: bundle.conf,
				cards: bundle.cards,
				layout: bundle.layout,
			}),
		},
	);
	return parseStudioApiJson<PutStoryPackageResult>(res);
}

/** @deprecated 写章 bundle */
export async function putDiskStoryPackage(
	packageId: string,
	bundle: DiskStoryPackageBundle,
): Promise<PutStoryPackageResult> {
	return putDiskChapterBundle(
		packageId,
		bundle.conf.chapterId,
		bundle,
	);
}

export async function postDiskStoryPackage(body: {
	title: string;
	description?: string;
	withStartCard?: boolean;
	packageId?: string;
}): Promise<DiskChapterBundle> {
	const res = await fetch("/api/stories", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<DiskChapterBundle>(res);
}

export async function deleteDiskStoryPackage(
	packageId: string,
): Promise<{ packageId: string }> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`, {
		method: "DELETE",
	});
	return parseStudioApiJson<{ packageId: string }>(res);
}

export async function patchDiskPackageConf(
	packageId: string,
	body: { title: string },
): Promise<{ packageConf: PackageConf }> {
	const res = await fetch(`/api/stories/${encodeURIComponent(packageId)}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return parseStudioApiJson<{ packageConf: PackageConf }>(res);
}

export type ChaptersListData = {
	chapters: DiskChapterSummary[];
};

export async function fetchDiskChapterSummaries(
	packageId: string,
): Promise<ChaptersListData> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/chapters`,
	);
	return parseStudioApiJson<ChaptersListData>(res);
}

export async function postDiskChapter(body: {
	packageId: string;
	chapterId: string;
	title: string;
	withStartCard?: boolean;
}): Promise<DiskChapterBundle> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(body.packageId)}/chapters`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chapterId: body.chapterId,
				title: body.title,
				withStartCard: body.withStartCard,
			}),
		},
	);
	return parseStudioApiJson<DiskChapterBundle>(res);
}

export async function patchEntryChapterId(
	packageId: string,
	entryChapterId: string,
): Promise<{ packageConf: PackageConf }> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/chapters`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ entryChapterId }),
		},
	);
	return parseStudioApiJson<{ packageConf: PackageConf }>(res);
}

export async function deleteDiskChapter(
	packageId: string,
	chapterId: string,
): Promise<{ chapterId: string }> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(chapterId)}`,
		{ method: "DELETE" },
	);
	return parseStudioApiJson<{ chapterId: string }>(res);
}

export async function fetchDiskChapterValidation(
	packageId: string,
	chapterId: string,
): Promise<DiskPackageValidateResult> {
	const res = await fetch(
		`/api/stories/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(chapterId)}/validate`,
	);
	return parseStudioApiJson<DiskPackageValidateResult>(res);
}

/** @deprecated 包级 validate → 入口章 */
export async function fetchDiskStoryPackageValidation(
	packageId: string,
): Promise<DiskPackageValidateResult> {
	const list = await fetchDiskStoryPackagesList();
	const pkg = list.packages.find(function (p) {
		return p.packageId === packageId;
	});
	const chapterId = pkg?.entryChapterId ?? packageId;
	return fetchDiskChapterValidation(packageId, chapterId);
}

export type ImportStoryPackageResult = {
	packageId: string;
	entryChapterId: string;
	bundle: DiskChapterBundle;
	validation: ValidationReport;
};

export async function postImportDiskStoryPackage(body: {
	packageId: string;
	packageConf?: PackageConf;
	chapters?: DiskChapterBundle[];
	conf?: DiskChapterBundle["conf"];
	cards?: DiskChapterBundle["cards"];
	layout?: DiskChapterBundle["layout"];
}): Promise<ImportStoryPackageResult> {
	const payload =
		body.chapters && body.packageConf
			? {
					packageId: body.packageId,
					packageConf: body.packageConf,
					chapters: body.chapters,
				}
			: {
					packageId: body.packageId,
					conf: body.conf,
					cards: body.cards,
					layout: body.layout,
				};
	const res = await fetch("/api/stories/import", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return parseStudioApiJson<ImportStoryPackageResult>(res);
}
