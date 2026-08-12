/**
	* 上传资源文件：系统生成 assetId，multipart 写 data/assets/files + meta。
	*/
import { postAssetBinaryUpload } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** 资源上传写口结果；供页面更新选中项并刷新资源投影 */
export type UploadAssetResult = {
	/** 服务端确认写入的系统资源键；生命周期随 data/assets/meta 记录 */
	assetId: string;
	/** 上传后资源库列表使用的投影；不包含完整二进制内容 */
	summary: AssetSummary;
};

/**
	* 执行资源直传：客户端只传 File，assetId 与元数据由系统生成。
	*/
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
