/**
	* GET/PUT/DELETE /api/assets/[assetId] — 单资产读写删。
	*/
import {
	AssetMetaSchema,
	type AssetMeta,
} from "@airpc/rpg-engine";
import { assetMetaToSummary } from "@studio-v2/src/utils/server/assets/meta/assetMetaMapper.server";
import { apiOk } from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	assetFileExists,
	deleteAssetMetaJson,
	readAssetMetaJson,
	readAssetMetaMtimeIso,
	writeAssetMetaJson,
} from "@studio-v2/src/utils/server/assets/assetsFs.server";
import type { AssetSummary } from "@studio-v2/src/utils/server/types/assetSummary.server";
import { failFromUnknown, parsePutAssetBody } from "./route.helpers";

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
		return failFromUnknown(err);
	}
}

export async function PUT(
	req: Request,
	ctx: { params: Promise<{ assetId: string }> },
): Promise<Response> {
	try {
		const { assetId } = await ctx.params;
		const body = (await req.json()) as { asset?: unknown };
		const parsed = parsePutAssetBody(assetId, body);
		if (!parsed.ok) return parsed.response;
		await writeAssetMetaJson(assetId, parsed.meta);
		const record = await loadRecord(assetId);
		return apiOk(record);
	} catch (err) {
		return failFromUnknown(err);
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
		return failFromUnknown(err);
	}
}
