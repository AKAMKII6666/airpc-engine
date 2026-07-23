/**
	* 头像/图片直传：multipart → data/assets/files + meta；清除 pendingFile。
	* Server 侧副本；与 Client bis 同构，不以 import 同步。
	*/
import type { AssetMeta } from "@airpc/rpg-engine";
/** 头像直传允许的 MIME（与导向稿 05 §6.1 对齐） */
const AVATAR_MIME_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

/** 单文件上限；防止误传过大原图拖垮本机 Studio */
export const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

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

/**
	* 由 MIME 解析图片扩展名；非允许类型返回 null（调用方转 VALIDATION_FAILED）。
	*/
export function imageExtFromMime(mimeType: string): string | null {
	const key = mimeType.trim().toLowerCase();
	return AVATAR_MIME_EXT[key] ?? null;
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
