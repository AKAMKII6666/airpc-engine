/**
	* GET/PUT/DELETE /api/stories/[packageId]/chapters/[chapterId] — 章 bundle CRUD。
	* PUT：写盘后 validate；error 回滚。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	deleteDiskChapter,
	readDiskChapterBundle,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import { writeValidatedDiskChapterBundle } from "@studio-v2/src/utils/server/packages/fs/validate/writeValidatedPackage.server";

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

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ packageId: string; chapterId: string }> },
): Promise<Response> {
	try {
		const { packageId, chapterId } = await ctx.params;
		const bundle = await readDiskChapterBundle(packageId, chapterId);
		return apiOk(bundle);
	} catch (err) {
		return failFromUnknown(err);
	}
}

export async function PUT(
	req: Request,
	ctx: { params: Promise<{ packageId: string; chapterId: string }> },
): Promise<Response> {
	try {
		const { packageId, chapterId } = await ctx.params;
		const body = (await req.json()) as {
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
		const confObj = body.conf as { chapterId?: string };
		if (confObj.chapterId && confObj.chapterId !== chapterId) {
			return apiFail("VALIDATION_FAILED", "conf.chapterId mismatch");
		}
		const result = await writeValidatedDiskChapterBundle(
			packageId,
			chapterId,
			{
				conf: { ...(body.conf as object), chapterId },
				cards: body.cards,
				layout: body.layout,
			},
		);
		if (!result.ok) {
			return apiFail(
				"PACKAGE_VALIDATION_FAILED",
				`章校验未通过（${result.report.errors.length} 个错误）`,
				422,
				{ report: result.report },
			);
		}
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({
			bundle: result.bundle,
			validation: result.report,
		});
	} catch (err) {
		return failFromUnknown(err);
	}
}

export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ packageId: string; chapterId: string }> },
): Promise<Response> {
	try {
		const { packageId, chapterId } = await ctx.params;
		const result = await deleteDiskChapter(packageId, chapterId);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk(result);
	} catch (err) {
		return failFromUnknown(err);
	}
}

/** GET validate 子路径由 [chapterId]/validate/route.ts 处理 */
