/**
	* GET/PUT/DELETE /api/assets/[assetId] — 单资产读写删。
	*/
import {
	AssetMetaSchema,
	formatZodError,
	isEngineError,
} from "@airpc/rpg-engine";
import type { AssetMeta } from "@airpc/rpg-engine";
import { assetMetaToSummary } from "@studio-v2/src/utils/server/assets/meta/assetMetaMapper.server";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	assetFileExists,
	deleteAssetMetaJson,
	readAssetMetaJson,
	readAssetMetaMtimeIso,
	writeAssetMetaJson,
} from "@studio-v2/src/utils/server/assets/assetsFs.server";
import type { AssetSummary } from "@studio-v2/src/utils/server/types/assetSummary.server";

async function loadRecord(
	assetId: string,
): Promise<{ asset: AssetSummary; meta: AssetMeta }> {
	const raw = await readAssetMetaJson(assetId);
	const parsed = AssetMetaSchema.safeParse(raw);
	if (!parsed.success) {
		throw Object.assign(
			new Error(`invalid AssetMeta for assetId: ${assetId}`),
			{ code: "VALIDATION_FAILED", issues: parsed.error.issues },
		);
	}
	const fileExists = await assetFileExists(parsed.data.uri);
	const lastEditedAt = await readAssetMetaMtimeIso(assetId);
	return {
		meta: parsed.data,
		asset: assetMetaToSummary(parsed.data, { fileExists, lastEditedAt }),
	};
}

export async function GET(
	_req: Request,
	ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
	try {
		const { assetId } = await ctx.params;
		const record = await loadRecord(assetId);
		return apiOk(record);
	} catch (err) {
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
}

export async function PUT(
	req: Request,
	ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
	try {
		const { assetId } = await ctx.params;
		const body = (await req.json()) as { asset?: unknown };
		if (!body.asset || typeof body.asset !== "object") {
			return apiFail("VALIDATION_FAILED", "asset object required");
		}
		const raw = body.asset as { assetId?: string };
		if (raw.assetId && raw.assetId !== assetId) {
			return apiFail("VALIDATION_FAILED", "assetId mismatch");
		}
		const parsed = AssetMetaSchema.safeParse({ ...raw, assetId });
		if (!parsed.success) {
			return apiFail(
				"VALIDATION_FAILED",
				formatZodError(parsed.error),
				400,
				{ issues: parsed.error.issues },
			);
		}
		await writeAssetMetaJson(assetId, parsed.data);
		const record = await loadRecord(assetId);
		return apiOk(record);
	} catch (err) {
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
}

export async function DELETE(
	_req: Request,
	ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
	try {
		const { assetId } = await ctx.params;
		await deleteAssetMetaJson(assetId);
		return apiOk({ ok: true });
	} catch (err) {
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
}
