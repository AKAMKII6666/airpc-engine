/**
	* GET/POST /api/assets — 全局资产列表与新建落盘（data/assets/meta）。
	*/
import {
	AssetMetaSchema,
	formatZodError,
	isEngineError,
	type AssetMeta,
} from "@airpc/rpg-engine";
import {
	assetMetaToSummary,
	buildAssetMetaFromCreateForm,
} from "@studio-v2/src/utils/server/assets/meta/assetMetaMapper.server";
import type { CreateAssetFormValues } from "@studio-v2/src/utils/server/assets/form/createAssetForm.server";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	assetFileExists,
	assetMetaExists,
	isValidAssetId,
	listAssetIds,
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

/**
	* 新建前校验 assetId：格式 + 未占用。
	* 通过返回 null；失败返回已构造的 apiFail Response。
	*/
async function rejectIfAssetIdUnavailable(
	assetId: string,
): Promise<Response | null> {
	if (!isValidAssetId(assetId)) {
		return apiFail("VALIDATION_FAILED", "assetId 格式无效");
	}
	if (await assetMetaExists(assetId)) {
		return apiFail(
			"VALIDATION_FAILED",
			`asset already exists: ${assetId}`,
		);
	}
	return null;
}

/** 路径 A：客户端已组好 AssetMeta */
async function postFromAssetMeta(asset: unknown): Promise<Response> {
	const raw = asset as { assetId?: string };
	if (!raw.assetId || typeof raw.assetId !== "string") {
		return apiFail("VALIDATION_FAILED", "assetId required");
	}
	const blocked = await rejectIfAssetIdUnavailable(raw.assetId);
	if (blocked) return blocked;
	const parsed = AssetMetaSchema.safeParse(asset);
	if (!parsed.success) {
		return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
			issues: parsed.error.issues,
		});
	}
	await writeAssetMetaJson(parsed.data.assetId, parsed.data);
	return apiOk(await loadRecord(parsed.data.assetId));
}

/** 路径 B：新建表单 + 系统 assetId（资源库主路径） */
async function postFromCreateForm(
	assetId: string,
	form: CreateAssetFormValues,
): Promise<Response> {
	const blocked = await rejectIfAssetIdUnavailable(assetId);
	if (blocked) return blocked;
	const meta = buildAssetMetaFromCreateForm(assetId, form);
	const parsed = AssetMetaSchema.safeParse(meta);
	if (!parsed.success) {
		return apiFail("VALIDATION_FAILED", formatZodError(parsed.error), 400, {
			issues: parsed.error.issues,
		});
	}
	await writeAssetMetaJson(parsed.data.assetId, parsed.data);
	return apiOk(await loadRecord(parsed.data.assetId));
}

function failFromCaught(err: unknown): Response {
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

export async function GET(): Promise<Response> {
	try {
		const ids = await listAssetIds();
		const assets: AssetSummary[] = [];
		for (const assetId of ids) {
			assets.push((await loadRecord(assetId)).asset);
		}
		return apiOk({ assets });
	} catch (err) {
		return failFromCaught(err);
	}
}

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			asset?: unknown;
			form?: CreateAssetFormValues;
			assetId?: string;
		};
		if (body.asset && typeof body.asset === "object") {
			return postFromAssetMeta(body.asset);
		}
		if (!body.form || typeof body.form !== "object") {
			return apiFail(
				"VALIDATION_FAILED",
				"asset object or form required",
			);
		}
		if (!body.assetId || typeof body.assetId !== "string") {
			return apiFail("VALIDATION_FAILED", "assetId required");
		}
		return postFromCreateForm(body.assetId, body.form);
	} catch (err) {
		return failFromCaught(err);
	}
}
