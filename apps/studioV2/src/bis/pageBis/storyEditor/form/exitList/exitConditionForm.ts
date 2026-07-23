/**
	* 出口 ExitCondition v1：叶子 op 工厂、摘要派生、嵌套只读判定。
	* 真源写 exit.condition；conditionSummary 仅预览，禁止替代写盘。
	*/
import type { ExitCondition } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
/** v1 面板可编辑的叶子 op；and/or/not 嵌套不进可视化编辑器 */
export const EXIT_CONDITION_V1_OPS = [
	"always",
	"outcome_flag",
	"beat_completed",
	"beat_missing",
	"all_required_beats_completed",
] as const;

/**
	* v1 可编辑叶子 op 联合；与 EXIT_CONDITION_V1_OPS 同步。
	* 用于 Select value 与 isExitConditionV1Leaf 收窄，禁止把 and/or/not 当叶子。
	*/
export type ExitConditionV1Op = (typeof EXIT_CONDITION_V1_OPS)[number];

/** OutcomeFlagSchema 枚举；UI Select 与引擎对齐 */
export const OUTCOME_FLAG_OPTIONS = [
	{ value: "answered_completed", label: "已接通并完成" },
	{ value: "hangup_early", label: "提前挂断" },
	{ value: "user_rejected", label: "用户拒绝" },
	{ value: "timeout", label: "超时" },
] as const;

/**
	* 条件 op Select 选项；仅含 v1 叶子，不含 and/or/not。
	* 标签为简体中文；value 必须与引擎 ExitCondition.op 字面量一致。
	*/
export const EXIT_CONDITION_OP_OPTIONS: ReadonlyArray<{
	value: ExitConditionV1Op;
	label: string;
}> = [
	{ value: "always", label: "始终" },
	{ value: "outcome_flag", label: "通话结果标记" },
	{ value: "beat_completed", label: "节拍已完成" },
	{ value: "beat_missing", label: "节拍缺失" },
	{ value: "all_required_beats_completed", label: "全部必做节拍完成" },
];

/** 新建出口默认 condition；仅用于空出口，禁止拿去覆盖磁盘已有 condition */
export function defaultExitCondition(): ExitCondition {
	return {
		op: "outcome_flag",
		flag: "answered_completed",
		equals: true,
	};
}

/**
	* beatId Select 候选：本卡 requiredBeats ∪ 当前已选 id。
	* 当前 id 不在 requiredBeats 时仍保留，避免旧盘数据被下拉清空。
	*/
export function listBeatIdOptions(
	requiredBeats: readonly string[],
	currentBeatId?: string,
): string[] {
	const current =
		typeof currentBeatId === "string" && currentBeatId.trim() !== ""
			? [currentBeatId.trim()]
			: [];
	return Array.from(
		new Set([
			...requiredBeats.filter((id) => id.trim() !== ""),
			...current,
		]),
	);
}

/** 是否为 v1 可视化可编叶子（非 and/or/not） */
export function isExitConditionV1Leaf(
	condition: ExitCondition | undefined,
): condition is Extract<ExitCondition, { op: ExitConditionV1Op }> {
	if (!condition) return false;
	return (EXIT_CONDITION_V1_OPS as readonly string[]).includes(condition.op);
}

function beatIdFromPrev(prev?: ExitCondition): string {
	if (!prev) return "";
	if (prev.op !== "beat_completed" && prev.op !== "beat_missing") return "";
	return prev.beatId.trim();
}

function outcomeFlagFromPrev(prev?: ExitCondition): {
	flag: string;
	equals: boolean;
} {
	if (prev && prev.op === "outcome_flag") {
		return {
			flag: prev.flag.trim() !== "" ? prev.flag : "answered_completed",
			equals: prev.equals,
		};
	}
	return { flag: "answered_completed", equals: true };
}

/** 切换 op 时生成合法叶子；保留同族字段尽量不丢 */
export function buildExitConditionForOp(
	op: ExitConditionV1Op,
	prev?: ExitCondition,
): ExitCondition {
	if (op === "always") return { op: "always" };
	if (op === "all_required_beats_completed") {
		return { op: "all_required_beats_completed" };
	}
	if (op === "outcome_flag") {
		const { flag, equals } = outcomeFlagFromPrev(prev);
		return { op: "outcome_flag", flag, equals };
	}
	const beatId = beatIdFromPrev(prev);
	if (op === "beat_completed") return { op: "beat_completed", beatId };
	return { op: "beat_missing", beatId };
}

const LEAF_SUMMARY: Record<
	Exclude<ExitConditionV1Op, "outcome_flag" | "beat_completed" | "beat_missing">,
	string
> = {
	always: "始终",
	all_required_beats_completed: "全部必做节拍完成",
};

/** 由 condition 派生人话预览；嵌套给出只读提示，不假装可编 */
export function summarizeExitCondition(condition: ExitCondition): string {
	if (condition.op === "and") {
		return `复合条件 and（${condition.items.length} 项，只读）`;
	}
	if (condition.op === "or") {
		return `复合条件 or（${condition.items.length} 项，只读）`;
	}
	if (condition.op === "not") return "复合条件 not（只读）";
	if (condition.op === "always" || condition.op === "all_required_beats_completed") {
		return LEAF_SUMMARY[condition.op];
	}
	if (condition.op === "outcome_flag") {
		const flagLabel =
			OUTCOME_FLAG_OPTIONS.find((o) => o.value === condition.flag)?.label ??
			condition.flag;
		return condition.equals
			? `结果标记 · ${flagLabel}`
			: `结果标记非 · ${flagLabel}`;
	}
	const beatLabel =
		condition.beatId.trim() !== ""
			? condition.beatId
			: "（未选 beatId）";
	if (condition.op === "beat_completed") {
		return `节拍已完成 · ${beatLabel}`;
	}
	return `节拍缺失 · ${beatLabel}`;
}
