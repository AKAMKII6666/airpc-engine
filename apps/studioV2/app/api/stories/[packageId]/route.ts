/**
	* GET/PUT /api/stories/[packageId] — 整包读 / 整包写 data/storis-packages。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	readDiskStoryPackage,
	writeDiskStoryPackage,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";

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
		const bundle = await readDiskStoryPackage(packageId);
		return apiOk(bundle);
	} catch (err) {
		return failFromUnknown(err);
	}
}

/**
	* 整包保存：body = { conf, cards, layout? }；layout 缺省时写安全默认坐标。
	*/
export async function PUT(
	req: Request,
	ctx: { params: Promise<{ packageId: string }> },
): Promise<Response> {
	try {
		const { packageId } = await ctx.params;
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
		const confObj = body.conf as { packageId?: string };
		if (confObj.packageId && confObj.packageId !== packageId) {
			return apiFail("VALIDATION_FAILED", "conf.packageId mismatch");
		}
		const bundle = await writeDiskStoryPackage(packageId, {
			conf: body.conf,
			cards: body.cards,
			layout: body.layout,
		});
		return apiOk(bundle);
	} catch (err) {
		return failFromUnknown(err);
	}
}
