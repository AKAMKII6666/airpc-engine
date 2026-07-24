/**
	* 角色库投影契约。
	* 列表仍用 kind/bio/freeCall 等会话标签；详情编辑对齐 CharacterDef 嵌套字段。
	*/

import type {
	CharacterEditGender,
	PromptSceneLayerForm,
	PromptVariantForm,
} from "./characterFormShapes";

/** 角色在创作侧的类型标签；非引擎 runtime 枚举 */
export type CharacterKind = "story" | "support" | "schedule";

/** 默认自由通话卡就绪态；missing 表示尚未配置 FreeCard */
export type FreeCallReadiness = "ready" | "missing" | "draft";

/**
	* 列表/会话用性别；详情编辑三档 other 映射到 non_binary。
	* unspecified 仅兼容旧 mock，新编辑 UI 不提供该选项。
	*/
export type CharacterGender =
	| "female"
	| "male"
	| "non_binary"
	| "unspecified";

/**
	* 电话身份 / identity 投影（对齐 CharacterDef.identity + 列表兼容字段）。
	*/
export type CharacterIdentityProjection = {
	/** 法定/设定全名；空串表示未填，落盘 CharacterDef.identity */
	fullName: string;
	/** 昵称/口头称呼；空串表示未填 */
	nickname: string;
	/** 引擎落盘性别；详情表单三档映射见 characterDetailForm */
	gender: CharacterGender;
	/** 年龄整数；null 表示未填 */
	age: number | null;
	/** 生日文案；空串表示未填，格式由编辑 UI 约束（非 ISO 强制） */
	birthday: string;
	/**
		* 兼容旧列表展示的年龄备注；新详情 UI 不编辑。
		* 空串表示未填。
		*/
	ageNote: string;
	/**
		* 列表侧呼叫名兼容位；详情以 meta.phoneNumber 为准，保存时回写。
		*/
	phoneNumber: string;
	/** 默认可拨打；详情本轮不进主表单，保留会话值 */
	dialable: boolean;
};

/**
	* 人设资料 / persona 投影（对齐 CharacterDef.persona）。
	*/
export type CharacterPersonaProjection = {
	/** 系统人设提示词；空串表示未填，落盘 CharacterDef.persona */
	systemPrompt: string;
	/**
		* 人格扮演码（约定 MBTI 四字母）；空串表示未填。
		* Composer 写入 systemHard；编辑 UI 用 PERSONALITY_CODE_OPTIONS。
		*/
	personalityCode: string;
	/** 职业/身份标签；空串表示未填 */
	profession: string;
	/** 说话风格说明；空串表示未填 */
	speakingStyle: string;
	/** 示例台词列表；空数组表示无示例 */
	exampleLines: string[];
	/** TTS/音色资源键；空串表示未绑定音色 */
	voiceId: string;
	/** 音色备注；空串表示无备注，仅创作侧提示 */
	voiceNotes: string;
};

/** 通话过程话术投影；与 CharacterDef.callFlowPrompts 同构 */
export type CharacterCallFlowPromptsProjection = {
	/** 长静默催话变体列表；空数组表示未配置 */
	longSilence: PromptVariantForm[];
	/** 长通话催挂变体列表；空数组表示未配置 */
	longCallNudge: PromptVariantForm[];
	/** 挂机前道别变体列表；空数组表示未配置 */
	preHangupFarewell: PromptVariantForm[];
};

/** 角色库列表/详情投影 */
export type CharacterSummary = {
	/** 系统生成角色键；主列表不作为主字段展示 */
	agentId: string;
	/** 人类可读显示名 */
	displayName: string;
	/** 创作侧角色类型标签（列表用；详情本轮不编辑） */
	kind: CharacterKind;
	/**
		* 头像资源键；null 表示使用默认头像，禁止破图空白。
		* 与 meta.avatarAssetId 同步。
		*/
	avatarAssetId: string | null;
	/** 一句话简介；空串表示无简介（列表用；详情本轮不编辑） */
	bio: string;
	/** 被多少故事包引用；0 表示尚未挂入任何包 */
	packageRefCount: number;
	/** 默认自由通话卡就绪态（列表用；详情本轮不编辑） */
	freeCall: FreeCallReadiness;
	/**
		* 绑定的 FreeCallCard id；null 表示未绑（narrative-only 或历史缺卡）。
		* 「编辑自由通话卡」入口用此键拉盘。
		*/
	freeCardId: string | null;
	/** 最近修改时间 ISO-8601；仅 UI 投影 */
	lastEditedAt: string;
	/** 引用关系人话摘要；空数组表示无引用 */
	referenceLines: readonly string[];
	/** 电话身份投影；详情可编辑，落盘 CharacterDef.identity */
	identity: CharacterIdentityProjection;
	/** 人设投影；详情可编辑，落盘 CharacterDef.persona */
	persona: CharacterPersonaProjection;
	/**
		* 社交边人话摘要（多行文本）。
		* 本轮不做社交边完整 UI；详情不编辑。
		*/
	socialSummary: string;
	/** meta 投影：电话与头像；对齐 CharacterDef.meta */
	meta: {
		phoneNumber: string;
		avatarAssetId: string;
	};
	/** 通话过程话术；详情可编辑，落盘 CharacterDef.callFlowPrompts */
	callFlowPrompts: CharacterCallFlowPromptsProjection;
	/** 默认场景提示词层；详情可编辑，落盘 CharacterDef.defaultPromptScenes */
	defaultPromptScenes: PromptSceneLayerForm[];
};

/** 编辑器内角色浮窗条目：轻量，不做完整资料编辑 */
export type CharacterPickerItem = {
	/** 系统角色键；选择回填用，界面次要展示 */
	agentId: string;
	/** 显示名 */
	displayName: string;
	/** 本包挂卡数量；0 表示无挂卡 */
	pendingCardCount: number;
	/** 头像资源键；null → 默认头像 */
	avatarAssetId: string | null;
};

/** 再导出编辑态性别，供表单与校验引用 */
export type { CharacterEditGender };
