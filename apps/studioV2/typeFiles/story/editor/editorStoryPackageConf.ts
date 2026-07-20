/**
	* 故事编辑器「包配置」浮窗投影。
	* 字段名对齐引擎 StoryPackageConf；仅 Studio 只读 mock，不写 storis-packages。
	*/

/**
	* 包级元数据只读投影。
	* 与 CallCard 属性窗分离；编辑单卡请点画布节点。
	*/
export type EditorStoryPackageConfProjection = {
	/** 内容 schema 版本；只读 Label */
	schemaVersion: number;
	/** 系统包键；只读 Label，不手填 */
	packageId: string;
	/** 人类可读标题；空串表示未命名 */
	title: string;
	/** 参与角色 agentId 列表；只读展示 */
	participants: readonly string[];
	/** 入口卡 cardId；空串表示未指定 */
	entryCardId: string;
	/** 本包引用的全局 assetId；只读列表 */
	assetRefs: readonly string[];
	/** 包内卡片摘要；仅 cardId，非完整 CallCard */
	cards: readonly { cardId: string }[];
};
