/**
	* 上传资源文件：系统生成 assetId，multipart 写 data/assets/files + meta。
	*/
import { postAssetBinaryUpload } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

export type UploadAssetResult = {
	assetId: string;
	summary: AssetSummary;
};

export async function commitUploadAssetFile(
	file: File,
): Promise<UploadAssetResult> {
	const assetId = createStudioId("asset", file.name);
	const summary = await postAssetBinaryUpload({
		assetId,
		file,
		displayName: file.name.replace(/\.[^.]+$/, ""),
	});
	return { assetId: summary.assetId, summary };
}
