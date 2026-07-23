/**
	* POST /api/assets/upload — multipart 直传图片到 data/assets（meta + files）。
	* 头像主路径复用本接口；禁止仅写假 assetId 不落盘。
	*/
import { AssetMetaSchema, formatZodError, isEngineError } from "@airpc/rpg-engine";
import {
	AVATAR_UPLOAD_MAX_BYTES,
	buildUploadedImageAssetMeta,
	imageExtFromMime,
} from "@studio-v2/src/utils/server/assets/upload/uploadAssetBinary.server";
import { assetMetaToSummary } from "@studio-v2/src/utils/server/assets/meta/assetMetaMapper.server";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	assetFileExists,
	assetMetaExists,
	isValidAssetId,
	readAssetMetaMtimeIso,
	writeAssetFileBytes,
	writeAssetMetaJson,
} from "@studio-v2/src/utils/server/assets/assetsFs.server";

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

function readOptionalString(form: FormData, key: string): string {
	const raw = form.get(key);
	return typeof raw === "string" ? raw.trim() : "";
}

/** 解析并校验 multipart 文件；失败返回 apiFail Response */
async function parseUploadFile(
	form: FormData,
): Promise<{ file: File; ext: string; mimeType: string } | Response> {
	const fileEntry = form.get("file");
	if (!(fileEntry instanceof File) || fileEntry.size <= 0) {
		return apiFail("VALIDATION_FAILED", "请选择要上传的图片文件");
	}
	if (fileEntry.size > AVATAR_UPLOAD_MAX_BYTES) {
		return apiFail(
			"VALIDATION_FAILED",
			`图片过大，上限 ${Math.floor(AVATAR_UPLOAD_MAX_BYTES / (1024 * 1024))}MB`,
		);
	}
	const mimeType = (fileEntry.type || "").trim().toLowerCase();
	const ext = imageExtFromMime(mimeType);
	if (!ext) {
		return apiFail("VALIDATION_FAILED", "仅支持 PNG / JPG / WebP 头像");
	}
	return { file: fileEntry, ext, mimeType };
}

export async function POST(req: Request): Promise<Response> {
	try {
		const form = await req.formData();
		const assetId = readOptionalString(form, "assetId");
		if (!assetId || !isValidAssetId(assetId)) {
			return apiFail("VALIDATION_FAILED", "assetId 格式无效");
		}
		if (await assetMetaExists(assetId)) {
			return apiFail(
				"VALIDATION_FAILED",
				`asset already exists: ${assetId}`,
			);
		}

		const parsedFile = await parseUploadFile(form);
		if (parsedFile instanceof Response) return parsedFile;

		const displayName =
			readOptionalString(form, "displayName") ||
			parsedFile.file.name.replace(/\.[^.]+$/, "") ||
			assetId;
		const usageRaw = readOptionalString(form, "usage");
		const usage = usageRaw === "avatar" ? ("avatar" as const) : undefined;

		const bytes = new Uint8Array(await parsedFile.file.arrayBuffer());
		const meta = buildUploadedImageAssetMeta({
			assetId,
			displayName,
			ext: parsedFile.ext,
			mimeType: parsedFile.mimeType,
			byteLength: bytes.byteLength,
			usage,
		});
		const parsed = AssetMetaSchema.safeParse(meta);
		if (!parsed.success) {
			return apiFail(
				"VALIDATION_FAILED",
				formatZodError(parsed.error),
				400,
				{ issues: parsed.error.issues },
			);
		}

		await writeAssetFileBytes(parsed.data.uri, bytes);
		await writeAssetMetaJson(assetId, parsed.data);

		const fileExists = await assetFileExists(parsed.data.uri);
		const lastEditedAt = await readAssetMetaMtimeIso(assetId);
		return apiOk({
			meta: parsed.data,
			asset: assetMetaToSummary(parsed.data, { fileExists, lastEditedAt }),
		});
	} catch (err) {
		return failFromCaught(err);
	}
}
