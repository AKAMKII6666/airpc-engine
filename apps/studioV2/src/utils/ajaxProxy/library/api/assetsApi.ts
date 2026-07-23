/**
	* 资源库 BFF：读写 data/assets（经 /api/assets）。
	* 列表/详情 UI 用 AssetSummary；写盘用 AssetMeta。
	*/
import type { AssetMeta } from "@studio-v2/typeFiles/library/assets/engineAssetMeta";
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { CreateAssetFormValues } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

export type AssetsListData = {
	assets: AssetSummary[];
};

export type AssetOneData = {
	asset: AssetSummary;
	/** 磁盘真源；详情保存合并用 */
	meta: AssetMeta;
};

/** GET /api/assets：列出磁盘资产投影 */
export async function fetchAssetSummaries(): Promise<AssetSummary[]> {
	const res = await fetch("/api/assets");
	const data = await parseStudioApiJson<AssetsListData>(res);
	return data.assets;
}

/** GET /api/assets/:assetId：投影 + 原始 meta */
export async function fetchAssetRecord(
	assetId: string,
): Promise<AssetOneData> {
	const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`);
	return parseStudioApiJson<AssetOneData>(res);
}

/**
	* POST /api/assets：表单新建（系统 assetId）。
	* 仅写 meta + pendingFile；真二进制请走 postAssetBinaryUpload。
	*/
export async function postAssetFromForm(
	assetId: string,
	form: CreateAssetFormValues,
): Promise<AssetSummary> {
	const res = await fetch("/api/assets", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ assetId, form }),
	});
	const data = await parseStudioApiJson<AssetOneData>(res);
	return data.asset;
}

/** 头像/图片 multipart 直传参数 */
export type PostAssetBinaryUploadInput = {
	/** 系统生成的 assetId */
	assetId: string;
	/** 本地图片 File（PNG/JPG/WebP） */
	file: File;
	/** 展示名；空则服务端用文件名 stem */
	displayName?: string;
	/** 标记 usage=avatar，写入 AssetMeta.meta */
	usage?: "avatar";
};

/**
	* POST /api/assets/upload：multipart 写 files/ + meta（头像直传主路径）。
	*/
export async function postAssetBinaryUpload(
	input: PostAssetBinaryUploadInput,
): Promise<AssetSummary> {
	const form = new FormData();
	form.append("assetId", input.assetId);
	form.append("file", input.file);
	if (input.displayName && input.displayName.trim().length > 0) {
		form.append("displayName", input.displayName.trim());
	}
	if (input.usage === "avatar") {
		form.append("usage", "avatar");
	}
	const res = await fetch("/api/assets/upload", {
		method: "POST",
		body: form,
	});
	const data = await parseStudioApiJson<AssetOneData>(res);
	return data.asset;
}

/** 头像预览 URL（同源 GET 二进制） */
export function assetFilePreviewUrl(assetId: string): string {
	return `/api/assets/${encodeURIComponent(assetId)}/file`;
}

/** PUT /api/assets/:assetId：整份 AssetMeta 落盘 */
export async function putAssetMeta(
	assetId: string,
	asset: AssetMeta,
): Promise<AssetSummary> {
	const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ asset }),
	});
	const data = await parseStudioApiJson<AssetOneData>(res);
	return data.asset;
}

/** DELETE /api/assets/:assetId */
export async function deleteAsset(assetId: string): Promise<void> {
	const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
		method: "DELETE",
	});
	await parseStudioApiJson<{ ok: true }>(res);
}
