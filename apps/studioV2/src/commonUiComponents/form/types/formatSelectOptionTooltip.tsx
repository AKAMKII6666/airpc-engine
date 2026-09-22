/**
	* Select 选项悬停文案：固定两行「作用 / 典型场景」。
	* 供 FormSelectField 与出口面板 MenuItem 共用，避免各处拼字符串。
	*/
import type { ReactNode } from "react";

/** 仅取 tooltip 所需字段；与 FormSelectOption / CallCardLabelOption 兼容 */
export type SelectOptionTooltipFields = {
	purpose?: string;
	exampleScenario?: string;
};

/**
	* 将 purpose / exampleScenario 格式化为 Tooltip title。
	* 两者皆空时返回 null，调用方应跳过 Tooltip 包裹。
	*/
export function formatSelectOptionTooltip(
	opt: SelectOptionTooltipFields,
): ReactNode | null {
	const purpose = opt.purpose?.trim() ?? "";
	const scenario = opt.exampleScenario?.trim() ?? "";
	if (purpose === "" && scenario === "") return null;
	return (
		<>
			{purpose !== "" ? <div>作用：{purpose}</div> : null}
			{scenario !== "" ? <div>典型场景：{scenario}</div> : null}
		</>
	);
}
