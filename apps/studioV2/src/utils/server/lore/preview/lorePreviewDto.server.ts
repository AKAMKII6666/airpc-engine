/**
	* Server 侧 lore 预览 DTO（与 typeFiles/library/users/loreBootstrap 镜像）。
	* 禁止 import Client typeFiles。
	*/

/** lore 生成来源 */
export type LoreSourceDto = "llm" | "fallback" | "manual";

/** 世界背景锚定地点 */
export type LoreLocationPreviewDto = {
	country: string;
	province: string;
	city: string;
	district?: string;
};

/** 详情页 lore 只读预览 */
export type LorePreviewDto = {
	source: LoreSourceDto;
	sharedPremise: string;
	generatedAt: string;
	location?: LoreLocationPreviewDto;
};
