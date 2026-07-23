/**
	* 新建资源：经 API 落盘 data/assets/meta；assetId 系统生成。
	* 仅写元数据（pendingFile）；头像/图片真文件走 commitUploadAvatarImage。
	*/
import { postAssetFromForm } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { CreateAssetFormValues } from "./createAssetForm";

/** 新建资源写盘结果 */
export type CreateAssetResult = {
	/** 新建后的 assetId，供选中详情 */
	assetId: string;
	/** 列表/浮窗用投影；由落盘回读，非会话假数据 */
	summary: AssetSummary;
};

/**
	* 创建资源元数据并写盘；返回投影供列表选中。
	*/
export async function commitCreateAsset(
	values: CreateAssetFormValues,
): Promise<CreateAssetResult> {
	const displayName = values.displayName.trim();
	const assetId = createStudioId("asset", displayName);
	const summary = await postAssetFromForm(assetId, values);
	return { assetId: summary.assetId, summary };
}
