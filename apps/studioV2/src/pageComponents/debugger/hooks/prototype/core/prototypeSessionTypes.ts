/**
	* 调试器电话原型会话类型。
	*/
import type { CallState, PhoneUiState, ReceiverMode } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerMemoryCommitTraceDetailView } from "@studio-v2/typeFiles/debugger/callSession";

export type HangupToastState = {
	/** 用于让同文案 toast 也能重新弹出 */
	id: number;
	/** toast 展示文案 */
	message: string;
} | null;

export type LastMemoryTraceState = {
	/** DTO id；用于面板标题与 trace 定位 */
	dtoId: string;
	/** 已读取并裁剪的 trace 详情 */
	detail: DebuggerMemoryCommitTraceDetailView;
} | null;

export type DebuggerPrototypeSession = {
	/** 纯前端通话态；控制聊天/待机两种 UI */
	callState: CallState;
	/** 纯前端电话硬件态；控制号码盘、拨号遮罩和留言提示 */
	phoneUi: PhoneUiState;
	/** 玩家输入草稿；后续发送给 server chat API */
	draft: string;
	/** start/message 请求中；用于禁用发送与拨号 */
	busy: boolean;
	/** 真实通话请求失败人话；无则 undefined */
	error: string | undefined;
	/** 是否存在真实未读留言；用于电话灯和 * 键 */
	hasUnreadVoicemail: boolean;
	/** 挂机后副作用 job 列表 */
	postCallJobs: DebuggerPostCallJobView[];
	/** job 列表轮询中 */
	postCallJobsLoading: boolean;
	/** job 列表失败人话 */
	postCallJobsError: string | undefined;
	/** 重试 failed_retryable job */
	retryPostCallJob: (jobId: string) => void;
	/** 正在重试的 jobId */
	postCallRetryingJobId: string | null;
	/** 挂断反馈 toast */
	hangupToast: HangupToastState;
	/** 最近一次挂机 Memory Trace 详情；待机态供右侧面板回看 */
	lastMemoryTrace: LastMemoryTraceState;
	/** 更新玩家输入草稿 */
	setDraft: (value: string) => void;
	/** 关闭挂断 toast */
	dismissHangupToast: () => void;
	/** 重置电话和通话 UI */
	resetDebugger: () => void;
	/** 摘机或免提，解锁号码盘 */
	liftReceiver: (receiverMode: ReceiverMode) => void;
	/** 处理号码键和留言 * 键 */
	pressDialKey: (key: string) => void;
	/** 重播最近号码；原型中回落到第一名角色号码 */
	redial: () => void;
	/** 发送玩家输入到真实调试通话 API */
	sendDraft: () => void;
	/** 编辑器入口：直接从指定章节/卡启动调试通话 */
	startSimulateCall: (chapterId: string, cardId: string) => void;
	/** 编辑器入口：从章节 entryCardId 启动调试通话 */
	startSimulateChapterCall: (chapterId: string) => void;
};

