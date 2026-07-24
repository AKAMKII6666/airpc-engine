/**
	* characters store 状态形状、会话初值与选中解析。
	* 与 writes / create 分离，避免循环 import。
	*/
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type { MemoryListItemDto } from "@studio-v2/typeFiles/library/characters/memory/memoryReadModel";
import type { DiskUserSummaryDto } from "@studio-v2/typeFiles/library/users/diskUserSummary";
import type { ScheduledIntent } from "@studio-v2/typeFiles/library/schedule/engineScheduledIntent";
import type {
	CharactersLoadResult,
	CharactersMemoryLoadResult,
	CharactersPanelUsersLoadResult,
	CharactersScheduleLoadResult,
} from "@studio-v2/typeFiles/library/characters/store/charactersStoreState";

/**
	* 刷新后选中 id：优先 preferSelectedId / 旧选中，否则首项。
	* 纯函数；供 applyListLoadResult 与单测共用。
	*/
export function pickCharactersSelectedId(
	list: readonly CharacterSummary[],
	preferId: string | undefined,
	prevSelectedId: string,
): string {
	const want = preferId ?? prevSelectedId;
	if (want !== "" && list.some((c) => c.agentId === want)) {
		return want;
	}
	return list[0]?.agentId ?? "";
}

export type CharactersStoreState = {
	/** 列表投影；非 CharacterDef 全文 */
	characters: CharacterSummary[];
	/** 当前选中 agentId；空串表示无选中 */
	selectedId: string;
	/** 列表 GET 进行中 */
	loading: boolean;
	/** 列表加载失败人话；成功时 undefined */
	loadError: string | undefined;
	/**
		* shell 有界重拉计数。
		* feature bump 后 shell 再拉；store 自身不发请求。
		*/
	refreshStamp: number;
	/**
		* 下次成功加载时优先选中的 agentId。
		* create 成功后写入，load 成功消费后清掉。
		*/
	preferSelectedId: string | undefined;

	/** 记忆/日程子面板：调试用户列表 */
	panelUsers: DiskUserSummaryDto[];
	/** 子面板用户列表加载中 */
	panelUsersLoading: boolean;
	/** 子面板用户列表失败人话 */
	panelUsersError: string | undefined;
	/** 子面板当前选中 userId；空串表示无选中 */
	panelUserId: string;

	/** 记忆分页条目 */
	memoryItems: MemoryListItemDto[];
	/** 记忆总条数 */
	memoryTotal: number;
	/** 记忆 1-based 页码 */
	memoryPage: number;
	/** 记忆加载中 */
	memoryLoading: boolean;
	/** 记忆失败人话 */
	memoryError: string | undefined;

	/** 日程意图列表 */
	scheduleIntents: ScheduledIntent[];
	/** Profile.schedule.clockMs；表单换算用 */
	scheduleClockMs: number;
	/** 日程加载中 */
	scheduleLoading: boolean;
	/** 日程失败人话 */
	scheduleError: string | undefined;

	/** shell 开始拉列表：清错误、置 loading */
	applyListLoadStarted: () => void;
	/** shell 拉列表结果：成功灌列表并解析选中；失败只记 loadError */
	applyListLoadResult: (result: CharactersLoadResult) => void;
	/** UI 经 bis 切换选中 */
	setSelectedId: (agentId: string) => void;
	/**
		* 详情保存 / 创建后的单条 upsert。
		* 不碰 refreshStamp；调用方若需全量重拉应另 bump。
		*/
	applyCharacterUpsertResult: (summary: CharacterSummary) => void;
	/** feature 请求下次加载优先选中某 id（常与 bump 连用） */
	setPreferSelectedId: (agentId: string | undefined) => void;
	/** feature 请求 shell 有界重拉 */
	bumpCharactersRefreshStamp: () => void;
	/** 离页或强制清空会话 */
	resetCharactersSession: () => void;

	/** 子面板：开始拉调试用户 */
	applyPanelUsersLoadStarted: () => void;
	/** 子面板：灌调试用户列表并解析选中 */
	applyPanelUsersLoadResult: (result: CharactersPanelUsersLoadResult) => void;
	/** 子面板：切换调试用户 */
	setPanelUserId: (userId: string) => void;

	/** 记忆：开始拉分页 */
	applyMemoryLoadStarted: () => void;
	/** 记忆：灌分页结果 */
	applyMemoryLoadResult: (result: CharactersMemoryLoadResult) => void;
	/** 记忆：无 userId 时清空 */
	clearMemoryList: () => void;

	/** 日程：开始拉列表 */
	applyScheduleLoadStarted: () => void;
	/** 日程：灌列表结果 */
	applyScheduleLoadResult: (result: CharactersScheduleLoadResult) => void;
	/** 日程：无 userId 时清空 */
	clearScheduleList: () => void;
	/** 日程：仅写人话错误（表单校验等） */
	setScheduleError: (message: string | undefined) => void;
};

/** 会话初值（不含 refreshStamp / actions）；reset 时复用 */
export function createCharactersSessionSlice(): Pick<
	CharactersStoreState,
	| "characters"
	| "selectedId"
	| "loading"
	| "loadError"
	| "preferSelectedId"
	| "panelUsers"
	| "panelUsersLoading"
	| "panelUsersError"
	| "panelUserId"
	| "memoryItems"
	| "memoryTotal"
	| "memoryPage"
	| "memoryLoading"
	| "memoryError"
	| "scheduleIntents"
	| "scheduleClockMs"
	| "scheduleLoading"
	| "scheduleError"
> {
	return {
		characters: [],
		selectedId: "",
		loading: false,
		loadError: undefined,
		preferSelectedId: undefined,
		panelUsers: [],
		panelUsersLoading: false,
		panelUsersError: undefined,
		panelUserId: "",
		memoryItems: [],
		memoryTotal: 0,
		memoryPage: 1,
		memoryLoading: false,
		memoryError: undefined,
		scheduleIntents: [],
		scheduleClockMs: 0,
		scheduleLoading: false,
		scheduleError: undefined,
	};
}
