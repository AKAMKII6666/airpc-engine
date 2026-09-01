/**
	* 玩家世界背景（lore）客户端 DTO；与引擎 WorldLoreDoc 字段镜像，禁止 import 引擎。
	*/

/** lore 生成来源；与 Profile.world.lore.source 对齐 */
export type LoreSourceDto = "llm" | "fallback" | "manual";

/** 世界背景锚定地点只读投影；与 Profile.world.lore.location 对齐 */
export type LoreLocationPreviewDto = {
	country: string;
	province: string;
	city: string;
	/** 区/县；可空 */
	district?: string;
};

/**
 * 详情页只读展示用；与 Profile.world.lore 摘要字段镜像，禁止 import 引擎。
 */
export type LorePreviewDto = {
	source: LoreSourceDto;
	/** 共享前提；通话 softExtras 主文案 */
	sharedPremise: string;
	/** ISO 生成时间 */
	generatedAt: string;
	/** bootstrap 时写入的锚定地点；可与 user.location 对照 */
	location?: LoreLocationPreviewDto;
};

/**
	* POST /api/users/:userId/lore/bootstrap 成功体。
	* UI 只读预览见 {@link LorePreviewDto}；完整 perspectives 不进 client。
	*/
export type LoreBootstrapResultDto = {
	/** 写入后的 lore 预览；与 GET lorePreview 同形 */
	lore: LorePreviewDto;
	/** true 表示本次写入走了 Host fallback 模板 */
	usedFallback: boolean;
	/** LLM 失败等原因；仅 usedFallback 时有意义，可空 */
	errorMessage?: string;
};
