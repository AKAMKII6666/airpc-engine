/**
	* /api/stories/import 旁路：整包写入后入口章校验与 Host 重载。
	*/
import { isEngineError, type PackageConf } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import { deleteDiskStoryPackage } from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import {
	writeValidatedDiskChapterBundle,
	type WriteValidatedChapterInput,
} from "@studio-v2/src/utils/server/packages/fs/validate/writeValidatedPackage.server";

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	const code =
		err && typeof err === "object" && "code" in err
			? String((err as { code: string }).code)
			: "ENGINE_INTERNAL";
	return apiFail(
		code,
		err instanceof Error ? err.message : String(err),
		httpStatusForCode(code),
	);
}

/**
	* 容器已落盘后：定位入口章、跑校验写盘；失败则回滚删包。
	*/
export async function validateImportedEntryChapter(args: {
	packageId: string;
	packageConf: PackageConf;
	chapters: WriteValidatedChapterInput[];
}): Promise<Response> {
	const { packageId, packageConf, chapters } = args;
	const entryId = packageConf.entryChapterId;
	const entryChapter = chapters.find(function (ch) {
		const c = ch.conf as { chapterId?: string };
		return c.chapterId === entryId;
	});
	if (!entryChapter) {
		await deleteDiskStoryPackage(packageId);
		return apiFail(
			"VALIDATION_FAILED",
			"entryChapterId 不在导入章列表中",
		);
	}

	const result = await writeValidatedDiskChapterBundle(
		packageId,
		entryId,
		entryChapter,
	);
	if (!result.ok) {
		await deleteDiskStoryPackage(packageId);
		return apiFail(
			"PACKAGE_VALIDATION_FAILED",
			`导入校验未通过（${result.report.errors.length} 个错误）`,
			422,
			{ report: result.report },
		);
	}

	await reloadStudioV2WorkspaceIfBooted();
	return apiOk({
		packageId,
		entryChapterId: entryId,
		bundle: result.bundle,
		validation: result.report,
	});
}
