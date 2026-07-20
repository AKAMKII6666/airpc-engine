/**
	* 资源删除编排（静态阶段）：确认后从会话 mock 移除。
	* 禁止 Host 写口与「已从磁盘删除」文案。
	*/
import { removeMockAsset } from "@studio-v2/src/utils/ajaxProxy/library/mock/mockLibraryData";

/** 删除资源 mock 提交结果 */
export type DeleteAssetResult = {
	/** 被移除的 assetId */
	assetId: string;
};

/**
	* 从会话内列表移除资源；找不到时抛错供确认弹层展示。
	*/
export function commitDeleteAssetMock(assetId: string): DeleteAssetResult {
	const ok = removeMockAsset(assetId);
	if (!ok) {
		throw new Error("未找到该资源，无法从会话内列表移除");
	}
	return { assetId };
}
