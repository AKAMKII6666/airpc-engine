/**
	* 内容包覆盖导入：解析本地 JSON → POST /api/content-pack/import。
	*/
import { postContentPackImport } from "@studio-v2/src/utils/ajaxProxy/packages/api/contentPackApi";
import {
	CONTENTPACK_FORMAT_ID,
	type ContentPackFileV1,
} from "@studio-v2/typeFiles/story/transfer/contentPackFile";

function asContentPack(raw: unknown): ContentPackFileV1 {
	if (!raw || typeof raw !== "object") {
		throw new Error("内容包须为 JSON 对象");
	}
	const obj = raw as ContentPackFileV1;
	if (obj.format !== CONTENTPACK_FORMAT_ID) {
		throw new Error(
			`未知内容包格式：${String(obj.format ?? "")}（需要 ${CONTENTPACK_FORMAT_ID}）`,
		);
	}
	return obj;
}

/**
	* 读文件文本 → 粗校验 format → 服务端覆盖导入。
	* 成功返回首故事 id；调用方 bump 列表。
	*/
export async function importContentPackFromText(
	text: string,
): Promise<{ startupPackageId: string; packageIds: string[] }> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text) as unknown;
	} catch {
		throw new Error("内容包不是合法 JSON");
	}
	const contentPack = asContentPack(parsed);
	return postContentPackImport(contentPack);
}
