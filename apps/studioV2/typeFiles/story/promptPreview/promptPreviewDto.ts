/**
	* 首通提示词预览 DTO（Client 镜像；与 Server preview 结果同构，禁止 import 引擎）。
	*/

/** 接通方向：玩家呼入 / 角色呼出；对齐 ComposeScene.callDirection */
export type PromptPreviewCallDirection = "inbound" | "outbound";

/**
	* Composer `RenderedPrompt` 镜像；仅观测，非磁盘真源。
	* 字段语义对齐引擎 beginCall 首通输出。
	*/
export type PromptPreviewRenderedPrompt = {
	/** 硬系统段列表；空数组表示无硬约束段 */
	systemHard: string[];
	/** 开场可说；缺省表示本通无 opening speakable */
	openingSpeakable?: string;
	/** 开场私有；缺省表示本通无 opening private */
	openingPrivate?: string;
	/** 可对用户说的主情境；空串表示未填 */
	speakable: string;
	/** 私有简报；空串表示未填 */
	private: string;
	/** soft 上下文段（含 Memory/Lore 注入）；空数组表示无 soft */
	softContext: string[];
	/** 命中的 promptScenes / default 层 id；空数组表示无层命中 */
	matchedLayerIds: string[];
	/** 调试笔记；缺省表示无 debug 载荷 */
	debug?: { notes?: string[] };
};

/**
	* Composer `ComposeScene` 镜像；由 callDirection + localHour 推导，非持久化。
	*/
export type PromptPreviewComposeScene = {
	/** 本通方向；inbound=玩家呼入，outbound=角色呼出 */
	callDirection: PromptPreviewCallDirection;
	/**
		* 用户本地时间；localHour 单位小时 0–23；
		* isoWithOffset 为预览用墙钟串，非真时钟。
		*/
	localTime: {
		isoWithOffset: string;
		timeZone?: string;
		localHour: number;
	};
	/** Free 包 allow_casual；故事包 correct_only */
	timeMentionPolicy: "allow_casual" | "correct_only";
};

/**
	* 工具定义观测镜像（policy ∩ Registry 后）；非 ToolRegistry 真源。
	*/
export type PromptPreviewTool = {
	/** 稳定 toolId；与 Registry 键对齐 */
	toolId: string;
	/** 人类可读名；仅展示 */
	displayName: string;
	/** 允许的 cardKind 列表；空数组表示无 kind 限制（异常） */
	allowedCardKinds: string[];
	/** playback 阶段是否可用 */
	allowedInPlayback: boolean;
	/** register_exit | session_local 等行为标签 */
	behavior: string;
};

/**
	* POST /api/prompt-preview 成功 data。
	* 编辑期观测窗口；不建 CallSession、不写盘。
	*/
export type PromptPreviewResult = {
	/** 本次预览所用玩家；须已 ensureProfile */
	userId: string;
	/** 有效 packageId；Free 为 __free__ */
	packageId: string;
	/** 本通 ComposeScene */
	composeScene: PromptPreviewComposeScene;
	/** Composer 分段结果 */
	renderedPrompt: PromptPreviewRenderedPrompt;
	/** 与 renderedPrompt.matchedLayerIds 同值，便于顶栏摘要 */
	matchedLayerIds: string[];
	/** 本通可见工具；空数组表示 deny_all 或无匹配 */
	tools: PromptPreviewTool[];
	/** Adapter 同口径 system 分段；空数组表示无 system */
	systemMessages: string[];
	/** systemMessages 以 \\n\\n 拼接；空串表示无 system */
	systemJoined: string;
	/** 注入 Composer 前的 softExtras 原文；空数组表示无 Memory/Lore */
	softExtras: string[];
};

/**
	* POST /api/prompt-preview 请求体（Client → Server）。
	*/
export type PromptPreviewRequestBody = {
	/** 当前 Studio 玩家；空串由门面拒为 USER_REQUIRED */
	userId: string;
	/** 接通方式 → ComposeScene.callDirection */
	callDirection: PromptPreviewCallDirection;
	/** 用户本地小时；单位 0–23 */
	localHour: number;
	/** 故事包键；Free 可省略（服务端回落 __free__） */
	packageId?: string;
	/** 引擎 CallCard 同构 JSON（Client 投影转 def 后提交） */
	card: unknown;
};
