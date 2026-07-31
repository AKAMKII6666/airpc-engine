/**
	* GET /api/stories/[packageId]/chapters — 列章摘要
	* POST — 新建章
	* PATCH — 设 entryChapterId
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { reloadStudioV2WorkspaceIfBooted } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	createDiskChapter,
	listDiskChapterSummaries,
	setDiskEntryChapterId,
} from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import {
	isValidChapterId,
	isValidPackageId,
} from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";

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
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const chapters = await listDiskChapterSummaries(packageId);
		return apiOk({ chapters });
	} catch (err) {
		return failFromUnknown(err);
	}
}

export async function POST(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		const body = (await req.json()) as {
			chapterId?: unknown;
			title?: unknown;
			withStartCard?: unknown;
		};
		const chapterId =
			typeof body.chapterId === "string" ? body.chapterId.trim() : "";
		const title = typeof body.title === "string" ? body.title.trim() : "";
		if (!isValidChapterId(chapterId)) {
			return apiFail("VALIDATION_FAILED", "invalid chapterId");
		}
		if (title.length === 0) {
			return apiFail("VALIDATION_FAILED", "title required");
		}
		const bundle = await createDiskChapter({
			packageId,
			chapterId,
			title,
			withStartCard: body.withStartCard !== false,
		});
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk(bundle, { status: 201 });
	} catch (err) {
		return failFromUnknown(err);
	}
}

export async function PATCH(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
		if (!isValidPackageId(packageId)) {
			return apiFail("VALIDATION_FAILED", "invalid packageId");
		}
		const body = (await req.json()) as { entryChapterId?: unknown };
		const entryChapterId =
			typeof body.entryChapterId === "string"
				? body.entryChapterId.trim()
				: "";
		if (!isValidChapterId(entryChapterId)) {
			return apiFail("VALIDATION_FAILED", "invalid entryChapterId");
		}
		const packageConf = await setDiskEntryChapterId(
			packageId,
			entryChapterId,
		);
		await reloadStudioV2WorkspaceIfBooted();
		return apiOk({ packageConf });
	} catch (err) {
		return failFromUnknown(err);
	}
}
