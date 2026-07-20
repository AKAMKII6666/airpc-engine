/**
	* 角色详情 Formik / 列表编辑器共用的嵌套形状。
	* 对齐 CharacterDef 编辑投影；不含 timeBuckets；记忆不在此。
	*/

/** 过程话术变体；落盘至少 variantId + text */
export type PromptVariantForm = {
	/** 变体稳定键；同列表内唯一，落盘进 CharacterDef.callFlowPrompts */
	variantId: string;
	/** 话术正文；空串表示未填，保存前须校验非空 */
	text: string;
};

/** 本地小时半开区间；与引擎 localHourRange 同构 */
export type LocalHourRangeForm = {
	/** 区间起点（含）；单位本地小时 0–23 */
	from: number;
	/** 区间终点（不含）；单位本地小时 0–24，半开 [from,to) */
	to: number;
};

/**
	* 场景提示词层编辑投影。
	* priority 由拖拽顺序写回（建议 0,10,20…），与数组序一致。
	*/
export type PromptSceneLayerForm = {
	/** 层稳定键；同角色内唯一，落盘进 defaultPromptScenes */
	layerId: string;
	/** 匹配优先级；数值越大越优先，由拖拽顺序写回 */
	priority: number;
	/** 层生效条件；与引擎 PromptSceneLayer.match 同构 */
	match: {
		callDirection: "inbound" | "outbound" | "either";
		localHourRange: LocalHourRangeForm;
	};
	/** 命中后的提示词补丁；空串字段表示该槽位不覆盖 */
	patch: {
		openingSpeakable: string;
		openingPrivate: string;
		emotion: string;
		toneHint: string;
		appendSpeakable: string;
		appendPrivate: string;
	};
};

/** 详情编辑态性别三档；落盘映射到引擎 female/male/non_binary */
export type CharacterEditGender = "female" | "male" | "other";
