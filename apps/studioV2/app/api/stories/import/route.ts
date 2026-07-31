/**
	* POST /api/stories/import — 导入 .storypack.json 整包（多章）落盘。
	*/
import { isEngineError, PackageConfSchema } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	deleteDiskStoryPackage,
	packageExists,
	writeDiskPackageContainer,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import { writeValidatedDiskChapterBundle } from "@studio-v2/src/utils/server/packages/fs/validate/writeValidatedPackage.server";
import { parseImportBody } from "@studio-v2/src/utils/server/packages/import/importBodyParse.server";

function failFromUnknown(err: unknown): Response {
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

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as Record<string, unknown>;
		const parsed = parseImportBody(body);
		if (!parsed) {
			return apiFail(
				"VALIDATION_FAILED",
				"import body 须含 packageConf+chapters 或 legacy conf+cards",
			);
		}
		const { packageId, packageConf, chapters } = parsed;
		const confParsed = PackageConfSchema.safeParse({
			...(packageConf as object),
			packageId,
		});
		if (!confParsed.success) {
			return apiFail("VALIDATION_FAILED", "packageConf invalid");
		}
		if (await packageExists(packageId)) {
			return apiFail(
				"CONFLICT",
				`工作区已存在同名故事包：${packageId}`,
				409,
				{ packageId },
			);
		}

		await writeDiskPackageContainer(packageId, {
			packageConf: confParsed.data,
			chapters,
		});

		/** 逐章 validate 入口章 */
		const entryId = confParsed.data.entryChapterId;
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
	} catch (err) {
		return failFromUnknown(err);
	}
}
