/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/schema/character.ts 的 CharacterDefSchema（passthrough）。
	* 引擎侧字段多为 optional + passthrough；本镜像同样宽松，供 characterDefMapper 读写。
	*/

/** 话术变体；对齐引擎 callFlowPrompts 各槎位数组项 */
export type EngineCallFlowVariant = {
	/** 变体稳定键 */
	variantId: string;
	/** 话术正文 */
	text: string;
};

/**
	* 对齐 packages/rpg-engine/src/schema/promptScene.ts 的 PromptSceneLayerSchema。
	* match / patch 在引擎侧各带 `.default({})`，z.infer 输出为必填对象（内部字段各自 optional）；
	* CallCard.context.promptScenes 与 CharacterDef.defaultPromptScenes 共用同一引擎 schema，
	* 此处为唯一镜像来源，story/callCard/engineCallCard 复用本类型，禁止再各写一份。
	*/
export type EnginePromptSceneLayer = {
	/** 层稳定键 */
	layerId: string;
	/** 匹配优先级；数值越大越优先；缺省表示未设 */
	priority?: number;
	/** 层生效条件；对齐引擎 match（strict + default({})） */
	match: {
		callDirection?: "inbound" | "outbound" | "either";
		localHourRange?: {
			from: number;
			to: number;
		};
	};
	/** 命中后的提示词补丁；对齐引擎 patch（strict + default({})） */
	patch: {
		openingSpeakable?: string;
		openingPrivate?: string;
		emotion?: string;
		toneHint?: string;
		appendSpeakable?: string;
		appendPrivate?: string;
	};
};

/** 对齐引擎 CharacterDefSchema；.passthrough() 意图用可选 + 宽松嵌套表达 */
export type CharacterDef = {
	/** 内容版本；缺省视为 1 */
	schemaVersion?: number;
	/** 角色稳定键；全局唯一 */
	agentId: string;
	/** 展示名；缺省时 UI 回落 agentId */
	displayName?: string;
	/** 静态可拨；effectiveDialable 还需叠加 runtime.unlocked */
	dialable?: boolean;
	/** 仅叙事角色；true 时 effectiveDialable 恒 false */
	isNarrativeOnly?: boolean;
	/** 身份信息；引擎侧 passthrough，允许扩展键 */
	identity?: {
		fullName?: string;
		nickname?: string;
		gender?: string;
		age?: number;
		ageNote?: string;
		birthday?: string;
		[key: string]: unknown;
	};
	/** 人格设定；引擎侧 passthrough，允许扩展键 */
	persona?: {
		systemPrompt?: string;
		/** 人格扮演码；MBTI 四字母（如 ENFP） */
		personalityCode?: string;
		speakingStyle?: string;
		exampleLines?: string[];
		profession?: string;
		voiceId?: string;
		voiceNotes?: string;
		[key: string]: unknown;
	};
	/** 关联的 FreeCard id；缺省表示未绑定 */
	freeCardId?: string;
	/** 社交关系；对目标角色的可知/可提/可介绍位 */
	social?: Array<{
		targetAgentId: string;
		canKnow?: boolean;
		canMention?: boolean;
		canIntroduce?: boolean;
		[key: string]: unknown;
	}>;
	/** 本通卡未写 opening 时回落；与卡 promptScenes 同构 */
	defaultPromptScenes?: EnginePromptSceneLayer[];
	/** 通话流程话术；引擎侧 passthrough */
	callFlowPrompts?: {
		longSilence?: EngineCallFlowVariant[];
		longCallNudge?: EngineCallFlowVariant[];
		preHangupFarewell?: EngineCallFlowVariant[];
		[key: string]: unknown;
	};
	/** 通话流程策略；引擎侧 passthrough */
	callFlowPolicy?: {
		silenceTimeoutMs?: number;
		callDurationThresholdMs?: number;
		preHangupLeadMs?: number;
		[key: string]: unknown;
	};
	/** 扩展元数据；引擎 v1 不强校验内部结构 */
	meta?: Record<string, unknown>;
	/** 引擎顶层 .passthrough()；未列举字段仍需保留 roundtrip */
	[key: string]: unknown;
};
