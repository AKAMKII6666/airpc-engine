/**
	* 调试器第一版 UI 原型模型。
	* 待机角色来自 server 投影；本文件只保留 UI 状态和格式化函数。
	*/
import type { DebuggerLlmPublicStatus } from "@studio-v2/typeFiles/debugger/llmStatus";
import type {
	DebuggerCallSessionView,
	DebuggerIncomingCallView,
	DebuggerShellEventView,
} from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerDialableRole } from "@studio-v2/typeFiles/debugger/dialableRole";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailboxView";

/** 电话号码盘键位；后续真实接线仍可复用该展示顺序 */
export const DIAL_KEYS = [
	{ key: "1", sub: "" },
	{ key: "2", sub: "ABC" },
	{ key: "3", sub: "DEF" },
	{ key: "4", sub: "GHI" },
	{ key: "5", sub: "JKL" },
	{ key: "6", sub: "MNO" },
	{ key: "7", sub: "PQRS" },
	{ key: "8", sub: "TUV" },
	{ key: "9", sub: "WXYZ" },
	{ key: "*", sub: "" },
	{ key: "0", sub: "+" },
	{ key: "#", sub: "" },
] as const;

/** 调试器角色行投影；待机列表和通话态共用 */
export type RoleRow = {
	/** 角色 agentId；拨通时交给 Host */
	agentId: string;
	/** 角色展示名 */
	name: string;
	/** 角色二级说明 */
	role: string;
	/** UI 展示电话号码 */
	number: string;
	/** 头像色彩 token */
	accent: "blue" | "teal" | "violet" | "amber" | "red";
	/** 待机态可见通话卡标签 */
	cards: string[];
	/** 更多卡数量；free 第一版恒 0 */
	more: number;
	/** 是否能通过外部入口拨 free card */
	canFreeCall: boolean;
	/** 不可拨原因；可拨时为 null */
	blockedReason: string | null;
};

export type ChatMessage = {
	/** 单轮消息唯一键；仅用于 React 列表稳定渲染 */
	id: string;
	/** 消息归属；决定左右气泡样式 */
	speaker: "npc" | "player";
	/** 展示文本；后续由真实 LLM 回复或用户输入填充 */
	text: string;
};

/** 通话态；idle 为待机，inCall 承载真实 Host session 浏览器投影 */
export type CallState =
	| { mode: "idle" }
	| {
			mode: "inCall";
			session: DebuggerCallSessionView;
			role: RoleRow;
		};

/** 电话硬件 UI 阶段；用于模拟摘机、拨号等待和建联遮罩 */
export type PhonePhase = "locked" | "ready" | "debouncing" | "dialing";
/** 接入方式；第一版只影响 UI 文案，不改变引擎行为 */
export type ReceiverMode = "handset" | "speaker";

export type PhoneUiState = {
	/** 电话硬件 UI 阶段；只模拟交互，不代表 Host session 状态 */
	phase: PhonePhase;
	/** 摘机或免提状态；null 表示电话仍在待机 */
	receiverMode: ReceiverMode | null;
	/** 用户当前输入号码；停 2 秒后自动拨号 */
	dialed: string;
};

export type LlmStatusView = {
	/** 脱敏后的模型状态；加载前或失败时为 null */
	status: DebuggerLlmPublicStatus | null;
	/** 状态请求中 */
	loading: boolean;
	/** 状态请求失败人话 */
	error: string | undefined;
};

const ACCENTS: RoleRow["accent"][] = ["blue", "teal", "violet", "amber", "red"];

/** 将 server 角色投影转成 debugger UI 行 */
export function toRoleRows(roles: readonly DebuggerDialableRole[]): RoleRow[] {
	return roles.map(function (role, index) {
		return {
			agentId: role.agentId,
			name: role.displayName,
			role: role.freeCardId ?? "未绑定 free card",
			number: role.phoneNumber,
			accent: ACCENTS[index % ACCENTS.length],
			cards: [role.canFreeCall ? "自由通话" : role.blockedReason ?? "不可拨"],
			more: 0,
			canFreeCall: role.canFreeCall,
			blockedReason: role.blockedReason,
		};
	});
}

/** 根据号码找到待机角色；空列表或无命中时返回 null */
export function findRoleByDialedNumber(
	dialed: string,
	roles: readonly RoleRow[],
): RoleRow | null {
	const normalized = dialed.replace(/\D/g, "");
	if (!normalized) return null;
	return roles.find(function (row) {
		return row.number.replace(/\D/g, "") === normalized;
	}) ?? null;
}

/** 根据 agentId 找待机角色；server 返回 session 后用于头像和号码展示 */
export function findRoleByAgentId(
	agentId: string,
	roles: readonly RoleRow[],
): RoleRow {
	return roles.find(function (row) {
		return row.agentId === agentId;
	}) ?? {
		agentId,
		name: agentId,
		role: "运行时角色",
		number: agentId,
		accent: "blue",
		cards: ["当前通话"],
		more: 0,
		canFreeCall: true,
		blockedReason: null,
	};
}

/** 判断留言槽是否需要点亮留言灯；与 server hasUnread 推导保持同构镜像，不以 import 同步 */
export function isUnreadVoicemailSlot(slot: DebuggerVoicemailSlotView): boolean {
	return slot.status === "unread" || slot.status === "stub_pending";
}

/** 选择 * 键要播放的第一条未读留言；UI 不复制 mailbox_open 裁决 */
export function firstUnreadVoicemail(
	slots: readonly DebuggerVoicemailSlotView[],
): DebuggerVoicemailSlotView | null {
	return slots.find(isUnreadVoicemailSlot) ?? null;
}

/** 将真实 Host turn 投影为聊天气泡消息 */
export function callSessionMessages(
	session: DebuggerCallSessionView,
): ChatMessage[] {
	const turns: ChatMessage[] = session.turns.map(function (turn, index) {
		return {
			id: `${turn.role}_${index}`,
			speaker: turn.role === "user" ? "player" : "npc",
			text: turn.text,
		};
	});
	const remoteHangup = latestRemoteHangupEvent(session);
	if (!remoteHangup) return turns;
	return [
		...turns,
		{
			id: `shell_${remoteHangup.eventId}`,
			speaker: "npc",
			text: remoteHangup.reason
				? `对方已挂断：${remoteHangup.reason}`
				: "对方已挂断",
		},
	];
}

/** 读取本通最近一次角色主动挂断 shell event；UI 用它锁定输入 */
export function latestRemoteHangupEvent(
	session: DebuggerCallSessionView,
): DebuggerShellEventView | null {
	return [...session.shellEvents].reverse().find(function (event) {
		return event.type === "call.hangup_requested";
	}) ?? null;
}

/** 通话中真实外呼只保留在 Host pending 队列，不打断当前调试 CallSession */
export function visibleIncomingCall(
	isInCall: boolean,
	incomingCall: DebuggerIncomingCallView | null,
): DebuggerIncomingCallView | null {
	if (isInCall) return null;
	return incomingCall;
}

/** 将电话硬件状态折叠为顶栏状态 chip 文案 */
export function phoneStatusLabel(
	phoneUi: PhoneUiState,
	isInCall: boolean,
): string {
	if (isInCall && phoneUi.phase === "locked") return "对方已挂断";
	if (isInCall) return "通话中";
	if (phoneUi.phase === "dialing") return "拨号中";
	if (phoneUi.phase === "debouncing") return "等待拨号";
	if (phoneUi.receiverMode === "speaker") return "免提待拨";
	if (phoneUi.receiverMode === "handset") return "摘机待拨";
	return "待机";
}

/** 电话屏幕主文案；展示号码、待机或拨号中状态 */
export function phoneDisplayMain(phoneUi: PhoneUiState): string {
	if (phoneUi.phase === "dialing") return "拨号中";
	if (phoneUi.phase === "debouncing") return phoneUi.dialed || "等待拨号";
	if (phoneUi.phase === "ready") return phoneUi.dialed || "请输入号码";
	return "未拨号 / 待机中";
}

/** 电话屏幕副文案；提示下一步可执行的硬件操作 */
export function phoneDisplaySub(
	phoneUi: PhoneUiState,
	hasUnreadVoicemail: boolean,
): string {
	if (phoneUi.phase === "dialing") return "正在建立 LLM 通话连接";
	if (phoneUi.phase === "debouncing") return "停止输入 2 秒后自动拨号";
	if (
		hasUnreadVoicemail &&
		(phoneUi.receiverMode === "speaker" || phoneUi.receiverMode === "handset")
	) {
		return "有新的留言，点击 * 号可看留言";
	}
	if (phoneUi.receiverMode === "speaker" || phoneUi.receiverMode === "handset") {
		return "没有新的留言，输入号码后自动拨号";
	}
	return "等待摘机或免提触发";
}

/** 将脱敏模型状态压成顶栏短文案 */
export function llmStatusText(input: LlmStatusView): string {
	if (input.loading) return "模型检测中";
	if (input.error) return "模型状态异常";
	if (!input.status) return "模型未检测";
	if (!input.status.enabled) return "模型已关闭";
	if (!input.status.configured) return "模型未配置";
	return `${input.status.model} · ${input.status.maskedApiKey ?? "server key"}`;
}
