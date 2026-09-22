/**
	* 枚举多选纯函数：规范化列表、watch 文案、勾选切换。
	* 抽出后压低 FormOptionMultiSelect 行数与圈复杂度。
	*/
import type { FormSelectOption } from "../../../types/formTypes";

export function asStringList(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((item) => (item == null ? "" : String(item))).filter(Boolean);
}

export function buildOptionMultiWatchText(
	selected: string[],
	options: FormSelectOption[],
): string {
	if (selected.length === 0) return "（未选）";
	const selectedSet = new Set(selected);
	const labels = options
		.filter((opt) => selectedSet.has(opt.value))
		.map((opt) => opt.label);
	return labels.join("；") || selected.join("；");
}

export function toggleOptionValue(
	selected: string[],
	toolId: string,
	checked: boolean,
): string[] {
	const selectedSet = new Set(selected);
	if (checked) {
		if (selectedSet.has(toolId)) return selected;
		return [...selected, toolId];
	}
	return selected.filter((id) => id !== toolId);
}
