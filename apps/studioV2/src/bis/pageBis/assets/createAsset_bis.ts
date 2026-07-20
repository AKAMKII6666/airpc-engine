/**
	* 新建资源编排（静态阶段）：Formik 校验后写入会话 mock。
	* 禁止 Host 写口、真上传与「已保存到磁盘」文案。
	*/
import { appendMockAsset } from "@studio-v2/src/utils/ajaxProxy/library/mock/mockLibraryData";
import {
	buildMockAssetFromForm,
	type CreateAssetFormValues,
} from "./createAssetForm";

/** 新建资源 mock 提交结果 */
export type CreateAssetResult = {
	/** 新建后的 assetId，供选中详情 */
	assetId: string;
};

/**
	* 将会话内 mock 列表前置一条新资源。
	*/
export function commitCreateAssetMock(
	values: CreateAssetFormValues,
): CreateAssetResult {
	const summary = buildMockAssetFromForm(values);
	appendMockAsset(summary);
	return { assetId: summary.assetId };
}
