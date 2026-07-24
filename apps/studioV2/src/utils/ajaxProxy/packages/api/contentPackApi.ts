/**
	* 内容包 BFF：导出 / 覆盖导入（经 /api/content-pack）。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { ContentPackFileV1 } from "@studio-v2/typeFiles/story/transfer/contentPackFile";

export type ContentPackExportData = {
	contentPack: ContentPackFileV1;
};

export type ContentPackImportResult = {
	startupPackageId: string;
	packageIds: string[];
};

/** GET /api/content-pack：构建并返回内容包 JSON */
export async function fetchContentPackExport(): Promise<ContentPackFileV1> {
	const res = await fetch("/api/content-pack");
	const data = await parseStudioApiJson<ContentPackExportData>(res);
	return data.contentPack;
}

/**
	* POST /api/content-pack/import：覆盖 storis-packages + workspace。
	* 缺/无效 startupPackageId 时服务端拒导。
	*/
export async function postContentPackImport(
	contentPack: ContentPackFileV1,
): Promise<ContentPackImportResult> {
	const res = await fetch("/api/content-pack/import", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ contentPack }),
	});
	return parseStudioApiJson<ContentPackImportResult>(res);
}
