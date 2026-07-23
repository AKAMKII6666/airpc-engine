/**
	* 资源删除：经 API 删除 data/assets/meta（及可解析的 files 条目）。
	*/
import { deleteAsset } from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";

/** 删除资源写盘结果 */
export type DeleteAssetResult = {
	/** 被移除的 assetId */
	assetId: string;
};

/**
	* 提交删除资产；失败抛错供确认弹层展示。
	*/
export async function commitDeleteAsset(
	assetId: string,
): Promise<DeleteAssetResult> {
	await deleteAsset(assetId);
	return { assetId };
}
