/**
	* 用户库 domain store 契约（FE）。
	* 非 Profile / Board / Memory 真源；shell 灌列表；UI 经 feature bis 读。
	*/
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";

/** shell 拉列表成功后一次灌入的载荷 */
export type UsersLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 列表投影；空数组表示库空 */
	profiles: readonly UserProfileSummary[];
};

/** 拉列表失败；message 已人话化 */
export type UsersLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误；空串不应出现 */
	message: string;
};

/**
	* 列表加载结果联合；shell 一次灌入，store 只消费结果。
	* 成功与失败互斥；禁止把 xhr 细节塞进本契约。
	*/
export type UsersLoadResult = UsersLoadOkPayload | UsersLoadFailPayload;
