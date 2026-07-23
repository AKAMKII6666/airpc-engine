/**
	* 调试器信箱 UI 投影（Client 镜像；与引擎 VoicemailSlot 字段对齐，禁止 import 引擎）。
	* 真源仍在 Profile.telephony；本类型仅供 XHR 展示与操作回传。
	*/

/** 与引擎 VoicemailSlotStatus 同构镜像（未读推导依赖 status，禁止另存 hasUnread 布尔） */
export type DebuggerVoicemailSlotStatus =
	| "pending_generate"
	| "generate_failed"
	| "unread"
	| "listened"
	| "stub_pending";

/**
	* 信箱单条槽投影。
	* 空字符串表示磁盘/Profile 缺省字段（非 null），便于表单展示。
	*/
export type DebuggerVoicemailSlotView = {
	/** 槽 id；Profile.telephony.voicemails[].id 真源 */
	id: string;
	/** 归属角色；听完 resolve 用 */
	agentId: string;
	/** 留言卡 cardId；缺省时为空串，listen API 会拒 */
	cardId: string;
	/** 故事包 id；缺省时为空串，UI 回落 wrong_number_act1 */
	packageId: string;
	/** 生命周期；unread/stub_pending 计入未读 */
	status: DebuggerVoicemailSlotStatus;
	/** 正文摘要（服务端截断）；单位：展示用短文本 */
	textPreview: string;
	/** 音频引用；引擎不解码，可为空串 */
	audioRef: string;
	/** ISO 创建时间；可为空串 */
	createdAt: string;
	/** ISO 听完时间；未听为空串 */
	listenedAt: string;
};

/**
	* GET /api/debug/mailbox 快照。
	* hasUnread 由服务端 deriveVoicemailHasUnread 推导，Client 不得私改。
	*/
export type DebuggerMailboxSnapshot = {
	/** 当前调试用户；与 data/users/<id> 对齐 */
	userId: string;
	/** 是否存在未读槽（含 stub_pending） */
	hasUnread: boolean;
	/** 全量槽列表（含已听）；顺序与 Profile 数组一致 */
	slots: DebuggerVoicemailSlotView[];
};

/**
	* POST /api/debug/mailbox/listen 结果。
	* 一次调用完成 mailbox_open beginCall + endCall；mailbox 为写后快照。
	*/
export type DebuggerMailboxListenResult = {
	/** 本通 Host sessionId */
	sessionId: string;
	/** ExitSelector 命中出口 id；无出口时为空串 */
	selectedExitId: string;
	/** 出口 reason 或 id 的展示文案 */
	exitTitle: string;
	/** 听完并可能写 listened 后的信箱快照 */
	mailbox: DebuggerMailboxSnapshot;
};
