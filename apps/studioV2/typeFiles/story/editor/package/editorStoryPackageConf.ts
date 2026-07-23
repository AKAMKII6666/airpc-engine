/**
	* 故事编辑器「包配置」浮窗投影。
	* 字段名对齐引擎 StoryPackageConf；entryCardId / assetRefs 可编，其余只读摘要。
	*/

/**
	* 包级元数据投影。
	* 与 CallCard 属性窗分离；可写字段经 PackageConfigFloat 写会话 bundle，顶栏保存落盘。
	*/
export type EditorStoryPackageConfProjection = {
	/** 内容 schema 版本；只读 Label */
	schemaVersion: number;
	/** 系统包键；只读 Label，不手填 */
	packageId: string;
	/** 人类可读标题；空串表示未命名 */
	title: string;
	/**
		* 本包引用角色 agentId（只读派生）。
		* 来自 cards owner/effects，非 conf.participants 白名单；作者不手维。
		*/
	participants: readonly string[];
	/** 入口卡 cardId；空串表示未指定；包配置 Select 可写 */
	entryCardId: string;
	/** 本包引用的全局 assetId；包配置多选可写 */
	assetRefs: readonly string[];
	/** 包内卡片摘要；仅 cardId，非完整 CallCard；作 entry Select 候选 */
	cards: readonly { cardId: string; title?: string }[];
};
