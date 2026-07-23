/**
	* 属性浮窗出口列表：增删与规范化纯函数。
	* exitId 自动生成，禁止用户手填为真源；与画布 Handle id 对齐。
	* effect 必须落入已知枚举；禁止自由文本写入。
	*/
import type { KnownEffectName } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import type {
	EditorCallCardExitProjection,
	EditorExitEffectProjection,
	EditorExitKind,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { EditorEffectParams } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { EFFECT_NAME_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";
import {
	defaultExitCondition,
	summarizeExitCondition,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";

/** 表单内出口行；与投影同构，供 Formik exits[] */
export type ExitListFormRow = EditorCallCardExitProjection;

/**
	* 规范化前的原始 Effect 行；effect / summary 可能是任意串（用户或旧数据）。
	* 用于把画布/旧数据的松散输入收敛为 EditorExitEffectProjection。
	*/
export type RawEffectRow = {
	/** 原始 id；空/非串会在规范化时被过滤 */
	id?: unknown;
	/** 原始 effect 名；未知串会被收敛为 keep_card_pending */
	effect?: unknown;
	/** 原始 critical；非布尔丢弃 */
	critical?: unknown;
	/** 原始摘要；空串规范化为 undefined */
	summary?: unknown;
	/** 参数投影；原样保留，判别键由调用方保证一致 */
	params?: EditorEffectParams;
};

const KNOWN_EFFECT_SET = new Set(
	EFFECT_NAME_OPTIONS.map((opt) => opt.value),
);

/** 将任意字符串收敛为已知 Effect 枚举；未知回落 keep_card_pending */
export function coerceKnownEffectName(raw: string): KnownEffectName {
	const trimmed = raw.trim();
	if (KNOWN_EFFECT_SET.has(trimmed)) return trimmed as KnownEffectName;
	return "keep_card_pending";
}

/** 生成不与已有 id 冲突的 exitId */
export function nextExitId(existing: readonly { exitId: string }[]): string {
	const used = new Set(existing.map((row) => row.exitId));
	let n = existing.length + 1;
	let candidate = `exit_${n}`;
	while (used.has(candidate)) {
		n += 1;
		candidate = `exit_${n}`;
	}
	return candidate;
}

/** 生成不与已有 id 冲突的 effect id */
export function nextEffectId(
	existing: readonly { id: string }[],
): string {
	const used = new Set(existing.map((row) => row.id));
	let n = existing.length + 1;
	let candidate = `fx_${n}`;
	while (used.has(candidate)) {
		n += 1;
		candidate = `fx_${n}`;
	}
	return candidate;
}

/** 新建 Effect mock 行；完整参数编排不做；effect 默认 keep_card_pending */
export function emptyEffectRow(
	existing: readonly EditorExitEffectProjection[],
): EditorExitEffectProjection {
	return {
		id: nextEffectId(existing),
		effect: "keep_card_pending",
		summary: "",
	};
}

/** 规范化 Effect 列表：trim、枚举收敛、保留 params、过滤空 id */
export function normalizeEffectList(
	rows: readonly RawEffectRow[] | undefined,
): EditorExitEffectProjection[] {
	if (!Array.isArray(rows)) return [];
	return rows
		.map((row) => {
			const id = typeof row.id === "string" ? row.id.trim() : "";
			const effect =
				typeof row.effect === "string"
					? coerceKnownEffectName(row.effect)
					: "keep_card_pending";
			const summary =
				typeof row.summary === "string" && row.summary.trim() !== ""
					? row.summary.trim()
					: undefined;
			// params / critical 原样保留；缺省不写键，保证可比对且 critical roundtrip
			const normalized: EditorExitEffectProjection = { id, effect, summary };
			if (row.params !== undefined) {
				normalized.params = row.params;
			}
			if (row.critical === true) {
				normalized.critical = true;
			}
			return normalized;
		})
		.filter((row) => row.id.length > 0);
}

/** 新建出口行；默认叶子 condition，summary 派生 */
export function emptyExitRow(
	existing: readonly ExitListFormRow[],
): ExitListFormRow {
	const exitId = nextExitId(existing);
	const condition = defaultExitCondition();
	return {
		exitId,
		title: `出口 ${existing.length + 1}`,
		priority: 0,
		condition,
		conditionSummary: summarizeExitCondition(condition),
		effects: [],
	};
}

/**
	* 规范化提交前出口列表：trim、过滤空 exitId、默认 priority / effects。
	* condition 原样保留（缺省不发明 DEFAULT，留给 mapper 回落 base）；
	* summary 空时由 condition 派生预览。
	*/
export function normalizeExitList(
	rows: readonly ExitListFormRow[],
): EditorCallCardExitProjection[] {
	return rows
		.map((row) => {
			const exitId = row.exitId.trim();
			const title =
				typeof row.title === "string" && row.title.trim() !== ""
					? row.title.trim()
					: undefined;
			const exitKind =
				row.exitKind === undefined ? undefined : (row.exitKind as EditorExitKind);
			// 故意不 `?? defaultExitCondition()`：缺省时写盘须保留磁盘 base（含嵌套）
			const condition = row.condition;
			const derived =
				condition !== undefined ? summarizeExitCondition(condition) : "";
			const conditionSummary =
				typeof row.conditionSummary === "string" &&
				row.conditionSummary.trim() !== ""
					? row.conditionSummary.trim()
					: derived;
			const priority =
				typeof row.priority === "number" && Number.isFinite(row.priority)
					? row.priority
					: 0;
			const normalized: EditorCallCardExitProjection = {
				exitId,
				title,
				exitKind,
				priority,
				conditionSummary,
				effects: normalizeEffectList(row.effects),
			};
			if (condition !== undefined) {
				normalized.condition = condition;
			}
			return normalized;
		})
		.filter((row) => row.exitId.length > 0);
}
