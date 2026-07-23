/**
	* 新建资源表单 values（Server 侧副本；与 Client createAssetForm 同构，不以 import 同步）。
	* API 只消费 shape，不依赖 Formik / AutoForm。
	*/
import type { AssetKind } from "@studio-v2/src/utils/server/types/assetSummary.server";

/** POST /api/assets body.values 最小字段 */
export type CreateAssetFormValues = {
	displayName: string;
	/** AssetKind 字符串 */
	kind: AssetKind;
	note: string;
} & Record<string, unknown>;
