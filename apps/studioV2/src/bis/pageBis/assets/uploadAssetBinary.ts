/**
	* 资源直传：multipart → data/assets/files + meta；清除 pendingFile。
	* 供 /api/assets/upload 与 commitUploadAvatarImage 共用。
	*/
import type { AssetMeta } from "@studio-v2/typeFiles/library/assets/engineAssetMeta";
import type { AssetKind } from "@studio-v2/typeFiles/library/assets/assetSummary";

const MIME_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/gif": "gif",
	"audio/wav": "wav",
	"audio/x-wav": "wav",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/ogg": "ogg",
	"audio/mp4": "m4a",
	"audio/aac": "aac",
	"audio/flac": "flac",
	"video/mp4": "mp4",
	"video/webm": "webm",
	"video/quicktime": "mov",
	"video/ogg": "ogv",
	"text/plain": "txt",
	"text/markdown": "md",
	"application/json": "json",
	"application/pdf": "pdf",
};

/** 单文件上限；防止误传过大素材拖垮本机 Studio */
export const ASSET_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
/** @deprecated 使用 ASSET_UPLOAD_MAX_BYTES */
export const AVATAR_UPLOAD_MAX_BYTES = ASSET_UPLOAD_MAX_BYTES;

/**
	* 直传成功后组装 AssetMeta 的入参。
	* 调用方须先校验 MIME/大小；本结构不承担 HTTP 解析。
	*/
export type BuildUploadedImageMetaInput = {
	/** 系统生成的 assetId；须已通过 isValidAssetId */
	assetId: string;
	/** 人类可读名；空则回落 assetId */
	displayName: string;
	/** 规范化后的扩展名（无点） */
	ext: string;
	/** 原始 MIME，写入 meta.mimeType 便于预览 */
	mimeType: string;
	/** 文件字节数；写入 measureValue（size_bytes） */
	byteLength: number;
	/**
		* 用途标记；avatar 时写入 meta.usage，便于资源库筛选。
		* 非头像直传可省略。
		*/
	usage?: "avatar";
};

export type BuildUploadedAssetMetaInput = BuildUploadedImageMetaInput & {
	fileName: string;
};

/**
	* 由 MIME 解析图片扩展名；非允许类型返回 null（调用方转 VALIDATION_FAILED）。
	*/
export function imageExtFromMime(mimeType: string): string | null {
	const key = mimeType.trim().toLowerCase();
	const ext = MIME_EXT[key];
	return ext && ["png", "jpg", "webp"].includes(ext) ? ext : null;
}

export function extFromMimeOrName(
	mimeType: string,
	fileName: string,
): string {
	const mimeExt = MIME_EXT[mimeType.trim().toLowerCase()];
	if (mimeExt) return mimeExt;
	const cleanName = fileName.trim().toLowerCase();
	const dot = cleanName.lastIndexOf(".");
	if (dot >= 0 && dot < cleanName.length - 1) {
		const ext = cleanName.slice(dot + 1).replace(/[^a-z0-9]+/g, "");
		if (ext.length > 0) return ext.slice(0, 12);
	}
	return "bin";
}

export function inferStudioKind(input: {
	mimeType: string;
	ext: string;
}): AssetKind {
	const mime = input.mimeType.trim().toLowerCase();
	const ext = input.ext.trim().toLowerCase();
	if (mime.startsWith("image/")) return "image";
	if (mime.startsWith("audio/")) return ext === "wav" ? "wav" : "bgm";
	if (mime.startsWith("video/")) return "other";
	if (mime.startsWith("text/") || ext === "md" || ext === "json") return "text";
	return "other";
}

function engineKindForStudioKind(kind: AssetKind): AssetMeta["kind"] {
	if (kind === "image") return "image";
	if (kind === "wav" || kind === "bgm") return "wav";
	return "prompt_clip";
}

function measureUnitForKind(kind: AssetKind): "size_bytes" | "duration_ms" | "none" {
	if (kind === "wav" || kind === "bgm") return "duration_ms";
	return "size_bytes";
}

/**
	* 组装已落盘图片的 AssetMeta（kind=image，pendingFile 清除）。
	*/
export function buildUploadedImageAssetMeta(
	input: BuildUploadedImageMetaInput,
): AssetMeta {
	const displayName = input.displayName.trim() || input.assetId;
	const uri = `files/${input.assetId}.${input.ext}`;
	const bag: Record<string, unknown> = {
		studioKind: "image",
		format: input.ext,
		measureValue: input.byteLength,
		measureUnit: "size_bytes",
		mimeType: input.mimeType,
		pendingFile: false,
	};
	if (input.usage === "avatar") {
		bag.usage = "avatar";
	}
	return {
		assetId: input.assetId,
		kind: "image",
		uri,
		displayName,
		meta: bag,
	};
}

export function buildUploadedAssetMeta(
	input: BuildUploadedAssetMetaInput,
): AssetMeta {
	const ext = input.ext || extFromMimeOrName(input.mimeType, input.fileName);
	const studioKind = inferStudioKind({ mimeType: input.mimeType, ext });
	const displayName =
		input.displayName.trim() ||
		input.fileName.replace(/\.[^.]+$/, "").trim() ||
		input.assetId;
	const uri = `files/${input.assetId}.${ext}`;
	const bag: Record<string, unknown> = {
		studioKind,
		format: ext,
		measureValue:
			studioKind === "wav" || studioKind === "bgm"
				? null
				: input.byteLength,
		measureUnit: measureUnitForKind(studioKind),
		mimeType: input.mimeType,
		originalFileName: input.fileName,
		pendingFile: false,
	};
	if (input.usage === "avatar") {
		bag.usage = "avatar";
	}
	return {
		assetId: input.assetId,
		kind: engineKindForStudioKind(studioKind),
		uri,
		displayName,
		meta: bag,
	};
}
