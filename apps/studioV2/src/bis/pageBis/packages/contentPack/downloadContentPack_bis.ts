/**
	* 内容包导出下载：服务端校验首故事后返回 JSON → 浏览器下载。
	*/
import { fetchContentPackExport } from "@studio-v2/src/utils/ajaxProxy/packages/api/contentPackApi";
import { CONTENTPACK_FORMAT_ID } from "@studio-v2/typeFiles/story/transfer/contentPackFile";

/**
	* 下载 .contentpack.json；不写其它本地目录。
	*/
export async function downloadContentPackExport(): Promise<{ fileName: string }> {
	const contentPack = await fetchContentPackExport();
	if (contentPack.format !== CONTENTPACK_FORMAT_ID) {
		throw new Error(`未知内容包格式：${String(contentPack.format)}`);
	}
	const stamp = contentPack.exportedAt.slice(0, 10) || "export";
	const fileName = `workspace.${stamp}.contentpack.json`;
	const blob = new Blob([JSON.stringify(contentPack, null, "\t")], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
	return { fileName };
}
