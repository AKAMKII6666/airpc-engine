/**
	* GET /api/stories/[packageId]/validate — 对磁盘已落盘包跑 validatePackage。
	* 只读校验；不写盘、不 Host beginCall。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { validateStoryPackageOnDisk } from "@studio-v2/src/utils/server/packages/validate/validateStoryPackage.server";

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
		const validation = await validateStoryPackageOnDisk(packageId);
		return apiOk({ validation });
	} catch (err) {
		return failFromUnknown(err);
	}
}
