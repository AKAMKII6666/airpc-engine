/**
	* 导出落盘下载：拉取磁盘整包 → 写 .storypack.json 触发浏览器下载。
	*/
import { fetchDiskStoryPackage } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import {
	STORYPACK_FORMAT_ID,
	type StorypackFileV1,
} from "@studio-v2/typeFiles/story/transfer/storypackFile";
import type { ExportKind } from "@studio-v2/typeFiles/story/transfer/packageTransfer";

/**
	* 将磁盘包下载为交换文件；不写工作区其它目录。
	*/
export async function downloadStorypackExport(input: {
	packageId: string;
	kind: ExportKind;
}): Promise<{ fileName: string }> {
	const bundle = await fetchDiskStoryPackage(input.packageId);
	const file: StorypackFileV1 = {
		format: STORYPACK_FORMAT_ID,
		exportedAt: new Date().toISOString(),
		kind: input.kind,
		bundle,
	};
	const fileName = `${input.packageId}.${input.kind}.storypack.json`;
	const blob = new Blob([JSON.stringify(file, null, "\t")], {
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
