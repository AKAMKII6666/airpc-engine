/**
	* 资源库 domain store 契约（FE）。
	* 非 data/assets 磁盘真源；shell 灌列表；UI 经 feature bis 读。
	*/
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/** shell 拉列表成功后一次灌入的载荷 */
export type AssetsLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 列表投影；空数组表示库空 */
	assets: readonly AssetSummary[];
};

/** 拉列表失败；message 已人话化 */
export type AssetsLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误；空串不应出现 */
	message: string;
};

/**
	* 列表加载结果联合；shell 一次灌入，store 只消费结果。
	* 成功与失败互斥；禁止把 xhr 细节塞进本契约。
	*/
export type AssetsLoadResult = AssetsLoadOkPayload | AssetsLoadFailPayload;
