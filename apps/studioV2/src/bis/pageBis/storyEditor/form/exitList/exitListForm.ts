/**
	* 属性浮窗出口列表：增删与规范化纯函数。
	* exitId 自动生成，禁止用户手填为真源；与画布 Handle id 对齐。
	* effect 必须落入已知枚举；禁止自由文本写入。
	*/
import type {
	EditorCallCardExitProjection,
	EditorExitEffectProjection,
	EditorExitKind,
} from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
import { EFFECT_NAME_OPTIONS } from "@studio-v2/typeFiles/story/callCardLabels";

/** 表单内出口行；与投影同构，供 Formik exits[] */
export type ExitListFormRow = EditorCallCardExitProjection;

const KNOWN_EFFECT_SET = new Set(
	EFFECT_NAME_OPTIONS.map((opt) => opt.value),
);

/** 将任意字符串收敛为已知 Effect 枚举；未知回落 keep_card_pending */
export function coerceKnownEffectName(raw: string): string {
	const trimmed = raw.trim();
	if (KNOWN_EFFECT_SET.has(trimmed)) return trimmed;
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

/** 规范化 Effect 列表：trim、枚举收敛、过滤空 id */
export function normalizeEffectList(
	rows: readonly EditorExitEffectProjection[] | undefined,
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
			return { id, effect, summary };
		})
		.filter((row) => row.id.length > 0);
}

/** 新建出口行；title/概要可随后在列表块里改 */
export function emptyExitRow(
	existing: readonly ExitListFormRow[],
): ExitListFormRow {
	const exitId = nextExitId(existing);
	return {
		exitId,
		title: `出口 ${existing.length + 1}`,
		exitKind: "handoff",
		priority: 0,
		conditionSummary: "",
		effects: [],
	};
}

/** 规范化提交前出口列表：trim、过滤空 exitId、默认 priority / effects */
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
			const conditionSummary =
				typeof row.conditionSummary === "string"
					? row.conditionSummary.trim()
					: "";
			const priority =
				typeof row.priority === "number" && Number.isFinite(row.priority)
					? row.priority
					: 0;
			return {
				exitId,
				title,
				exitKind,
				priority,
				conditionSummary,
				effects: normalizeEffectList(row.effects),
			};
		})
		.filter((row) => row.exitId.length > 0);
}
