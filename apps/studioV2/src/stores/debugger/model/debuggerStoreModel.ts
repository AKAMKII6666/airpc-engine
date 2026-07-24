/**
	* debugger store 状态形状、会话初值与默认常量。
	* 与 writes / create 分离，避免循环 import。
	*/
import type {
	DebuggerMailboxLoadResult,
	DebuggerSessionLoadResult,
	DebuggerSessionSnapshot,
	DebuggerValidatePackagesLoadResult,
	DebuggerValidateRunResult,
} from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";
import type { DebuggerMailboxSnapshot } from "@studio-v2/typeFiles/debugger/mailboxView";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";

/** 与 validateDiskPackage_bis 默认包对齐；store 禁 import bis */
export const VALIDATE_DEFAULT_PACKAGE_ID = "wrong_number_act1";

/** 与 data/users/demo-user 对齐；shell 首灌前的默认用户 */
export const DEBUGGER_STORE_DEFAULT_MAILBOX_USER_ID = "demo-user";

export type DebuggerStoreState = {
	/**
		* 叙事会话快照；null 表示尚未灌入或已 reset。
		* 静态阶段来自 mock；非 Host CallSession 真源。
		*/
	session: DebuggerSessionSnapshot | null;
	/** 会话灌入进行中 */
	sessionLoading: boolean;
	/** 会话灌入失败人话；成功时 undefined */
	sessionLoadError: string | undefined;
	/**
		* shell 有界重灌会话计数。
		* feature bump 后 shell 再灌；store 自身不读 mock。
		*/
	sessionRefreshStamp: number;

	/** 信箱当前用户；空串表示未选 */
	mailboxUserId: string;
	/** 信箱快照；null 表示未加载 */
	mailbox: DebuggerMailboxSnapshot | null;
	/** 信箱 GET 进行中 */
	mailboxLoading: boolean;
	/** 注入/听完等写口进行中 */
	mailboxBusy: boolean;
	/** 信箱失败人话；成功时 undefined */
	mailboxError: string | undefined;
	/** 最近一次听完摘要；无则 undefined */
	lastListenSummary: string | undefined;
	/**
		* shell 有界重拉信箱计数。
		* 改 userId / seed / listen / 手动刷新后 bump。
		*/
	mailboxRefreshStamp: number;

	/** 读盘 validate：包列表投影 */
	validatePackages: StoryPackageSummary[];
	/** 读盘 validate：当前选中 packageId */
	validatePackageId: string;
	/** 读盘 validate：列表加载中 */
	validateListLoading: boolean;
	/** 读盘 validate：列表失败人话 */
	validateListError: string | undefined;
	/** 读盘 validate：报告；未跑过为 null */
	validateReport: ValidationReport | null;
	/** 读盘 validate：单次校验进行中 */
	validating: boolean;
	/** 读盘 validate：单次失败人话 */
	validateError: string | undefined;

	/** shell 开始灌会话：清错误、置 loading */
	applySessionLoadStarted: () => void;
	/** shell 灌会话结果 */
	applySessionLoadResult: (result: DebuggerSessionLoadResult) => void;
	/** feature 请求 shell 重灌会话 */
	bumpSessionRefreshStamp: () => void;

	/** UI 经 bis 改信箱用户（不发请求；常与 bump 连用） */
	setMailboxUserId: (userId: string) => void;
	/** shell 开始拉信箱 */
	applyMailboxLoadStarted: () => void;
	/** shell 拉信箱结果 */
	applyMailboxLoadResult: (result: DebuggerMailboxLoadResult) => void;
	/** feature 写口开始：busy + 清错误 */
	applyMailboxCommandStarted: () => void;
	/**
		* feature 写口成功：灌新快照；可选听完摘要。
		* 不碰 refreshStamp（调用方已拿到结果，无需再拉）。
		*/
	applyMailboxCommandResult: (input: {
		mailbox: DebuggerMailboxSnapshot;
		lastListenSummary?: string | undefined;
	}) => void;
	/** feature 写口失败 */
	applyMailboxCommandFailed: (message: string) => void;
	/** feature 请求 shell 重拉信箱 */
	bumpMailboxRefreshStamp: () => void;
	/** 离页或强制清空会话（保留 stamp，避免误触发） */
	resetDebuggerSession: () => void;

	/** 读盘 validate：开始拉包列表 */
	applyValidatePackagesLoadStarted: () => void;
	/** 读盘 validate：灌包列表并解析选中 */
	applyValidatePackagesLoadResult: (
		result: DebuggerValidatePackagesLoadResult,
	) => void;
	/** 读盘 validate：切换包；清上次报告 */
	setValidatePackageId: (packageId: string) => void;
	/** 读盘 validate：开始单次校验 */
	applyValidateRunStarted: () => void;
	/** 读盘 validate：单次结果 */
	applyValidateRunResult: (result: DebuggerValidateRunResult) => void;
};

/** 会话初值（不含 stamp / actions）；reset 时复用 */
export function createDebuggerSessionSlice(): Pick<
	DebuggerStoreState,
	| "session"
	| "sessionLoading"
	| "sessionLoadError"
	| "mailboxUserId"
	| "mailbox"
	| "mailboxLoading"
	| "mailboxBusy"
	| "mailboxError"
	| "lastListenSummary"
	| "validatePackages"
	| "validatePackageId"
	| "validateListLoading"
	| "validateListError"
	| "validateReport"
	| "validating"
	| "validateError"
> {
	return {
		session: null,
		sessionLoading: false,
		sessionLoadError: undefined,
		mailboxUserId: DEBUGGER_STORE_DEFAULT_MAILBOX_USER_ID,
		mailbox: null,
		mailboxLoading: false,
		mailboxBusy: false,
		mailboxError: undefined,
		lastListenSummary: undefined,
		validatePackages: [],
		validatePackageId: VALIDATE_DEFAULT_PACKAGE_ID,
		validateListLoading: false,
		validateListError: undefined,
		validateReport: null,
		validating: false,
		validateError: undefined,
	};
}
