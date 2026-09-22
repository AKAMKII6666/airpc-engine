/**
	* /api/assets/[assetId] 旁路：PUT 体校验与错误码归一。
	*/
import {
	AssetMetaSchema,
	formatZodError,
	isEngineError,
	type AssetMeta,
} from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";

/** 将 catch 未知错误归一为 apiFail Response（含引擎错误与带 code 对象）。 */
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
	* 校验 PUT body.asset 与路径 assetId 一致且通过 AssetMetaSchema。
	* 失败直接返回可发出的 Response，成功返回解析后的 meta。
	*/
export function parsePutAssetBody(
	assetId: string,
	body: { asset?: unknown },
):
	| { ok: true; meta: AssetMeta }
	| { ok: false; response: Response } {
	if (!body.asset || typeof body.asset !== "object") {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "asset object required"),
		};
	}
	const raw = body.asset as { assetId?: string };
	if (raw.assetId && raw.assetId !== assetId) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "assetId mismatch"),
		};
	}
	const parsed = AssetMetaSchema.safeParse({ ...raw, assetId });
	if (!parsed.success) {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				formatZodError(parsed.error),
				400,
				{ issues: parsed.error.issues },
			),
		};
	}
	return { ok: true, meta: parsed.data };
}
