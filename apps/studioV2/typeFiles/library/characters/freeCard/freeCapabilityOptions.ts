/**
	* Free 卡固定能力开关：与引擎 builtinRegistry 中 allowedCardKinds 含 free 的工具对齐。
	* Client 镜像；不以 import 同步引擎。
	*/

export type FreeCapabilityToolId =
	| "refer_to_expert"
	| "share_expert_number"
	| "schedule_reminder_call"
	| "schedule_recurring_call"
	| "record_shared_secret"
	| "create_research_commitment"
	| "record_user_name"
	| "search_memory"
	| "get_memory_by_id";

/**
	* 弹窗里一项固定能力；toolId 与 Registry 对齐，label 仅 UI。
	*/
export type FreeCapabilityOption = {
	/** Registry toolId；落盘 toolPolicy.allowedToolIds */
	toolId: FreeCapabilityToolId;
	/** 弹窗开关标签（中文） */
	label: string;
};

/** 固定清单：只能开/关，UI 不可增删项 */
export const FREE_CAPABILITY_OPTIONS: readonly FreeCapabilityOption[] = [
	{ toolId: "refer_to_expert", label: "安排专家回电" },
	{ toolId: "share_expert_number", label: "已口播专家号码" },
	{ toolId: "schedule_reminder_call", label: "预约回电提醒" },
	{ toolId: "schedule_recurring_call", label: "登记重复外呼" },
	{ toolId: "record_shared_secret", label: "登记共同秘密" },
	{ toolId: "create_research_commitment", label: "研究承诺" },
	{ toolId: "record_user_name", label: "登记用户称呼" },
	{ toolId: "search_memory", label: "搜索记忆" },
	{ toolId: "get_memory_by_id", label: "按 id 取记忆" },
];

/** 壳侧主动挂机能力预留（决策过引擎后由壳钩子断线；本批仅落盘配置） */
export type ShellHangupCapabilityId = "policyHangup" | "naturalHangup";

/**
	* 主动挂机预留开关项；落盘 context.studioShellHangup，真接线另批。
	*/
export type ShellHangupCapabilityOption = {
	/** 开关稳定键；与 studioShellHangup 字段名对齐 */
	id: ShellHangupCapabilityId;
	/** 弹窗主标签（中文） */
	label: string;
	/** 辅助说明；解释壳钩子预留语义 */
	helperText: string;
};

/**
	* 主动挂机预留清单；默认全开，仅配置落盘，不进引擎 Registry 本批。
	*/
export const SHELL_HANGUP_CAPABILITY_OPTIONS: readonly ShellHangupCapabilityOption[] =
	[
		{
			id: "policyHangup",
			label: "违禁话题主动挂机",
			helperText: "模型可调挂机 FC；断线由壳执行（预留）",
		},
		{
			id: "naturalHangup",
			label: "道别后自然挂机",
			helperText: "双方道别后可主动结束线路（预留）",
		},
	];
