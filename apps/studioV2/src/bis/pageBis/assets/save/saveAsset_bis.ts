/**
	* 资源详情保存：经 API 读 AssetMeta → 合并表单 → PUT 落盘。
	*/
import { mergeDetailFormIntoAssetMeta } from "@studio-v2/src/bis/pageBis/assets/assetMetaMapper";
import type { AssetDetailFormValues } from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import {
	fetchAssetRecord,
	putAssetMeta,
} from "@studio-v2/src/utils/ajaxProxy/library/api/assetsApi";
import { isAssetMetaShape } from "@studio-v2/typeFiles/library/assets/engineAssetMeta";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/**
	* 详情表单落盘并回读投影；保留 uri / transcript 等引擎字段。
	* 本地用 isAssetMetaShape 预检（与引擎同构镜像，不以 import 同步）。
	*/
export async function commitSaveAssetDetail(
	previous: AssetSummary,
	values: AssetDetailFormValues,
): Promise<AssetSummary> {
	const { meta } = await fetchAssetRecord(previous.assetId);
	if (!isAssetMetaShape(meta)) {
		throw new Error(`磁盘 AssetMeta 无效：${previous.assetId}`);
	}
	const merged = mergeDetailFormIntoAssetMeta(meta, values);
	return putAssetMeta(previous.assetId, merged);
}
