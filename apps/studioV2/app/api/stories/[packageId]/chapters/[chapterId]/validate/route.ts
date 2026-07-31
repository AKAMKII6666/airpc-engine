/**
	* GET /api/stories/[packageId]/chapters/[chapterId]/validate — 章级只读 validate。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { validateStoryChapterOnDisk } from "@studio-v2/src/utils/server/packages/validate/validateStoryPackage.server";

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
		const { chapterId } = await ctx.params;
		const report = await validateStoryChapterOnDisk(chapterId);
		return apiOk({ report });
	} catch (err) {
		return failFromUnknown(err);
	}
}
