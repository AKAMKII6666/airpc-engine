/**
	* POST /api/stories/import — 导入 .storypack.json 整包落盘。
	* body: { conf, cards, layout?, packageId? }；冲突时返回 CONFLICT（由客户端改 id 再试）。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	packageExists,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";
import { writeValidatedDiskStoryPackage } from "@studio-v2/src/utils/server/packages/fs/writeValidatedPackage.server";
import { isValidPackageId } from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";

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

/**
	* 导入整包：校验 packageId → 冲突检测 → writeValidated。
	*/
export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			packageId?: unknown;
			conf?: unknown;
			cards?: unknown;
			layout?: unknown | null;
		};
		if (!body.conf || typeof body.conf !== "object") {
			return apiFail("VALIDATION_FAILED", "conf object required");
		}
		if (!Array.isArray(body.cards)) {
			return apiFail("VALIDATION_FAILED", "cards array required");
		}
		const confObj = body.conf as { packageId?: unknown };
		const packageId =
			typeof body.packageId === "string" && body.packageId.trim() !== ""
				? body.packageId.trim()
				: typeof confObj.packageId === "string"
					? confObj.packageId.trim()
					: "";
		if (!isValidPackageId(packageId)) {
			return apiFail(
				"VALIDATION_FAILED",
				"packageId 须为小写 snake_case（如 my_story_act1）",
			);
		}
		if (confObj.packageId && confObj.packageId !== packageId) {
			return apiFail("VALIDATION_FAILED", "conf.packageId mismatch");
		}
		if (await packageExists(packageId)) {
			return apiFail(
				"CONFLICT",
				`工作区已存在同名故事包：${packageId}`,
				409,
				{ packageId },
			);
		}
		const confForWrite = {
			...(body.conf as Record<string, unknown>),
			packageId,
		};
		const result = await writeValidatedDiskStoryPackage(packageId, {
			conf: confForWrite,
			cards: body.cards,
			layout: body.layout ?? null,
		});
		if (!result.ok) {
			return apiFail(
				"PACKAGE_VALIDATION_FAILED",
				`导入校验未通过（${result.report.errors.length} 个错误）`,
				422,
				{ report: result.report },
			);
		}
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({
			packageId: result.bundle.conf.packageId,
			bundle: result.bundle,
			validation: result.report,
		});
	} catch (err) {
		return failFromUnknown(err);
	}
}
