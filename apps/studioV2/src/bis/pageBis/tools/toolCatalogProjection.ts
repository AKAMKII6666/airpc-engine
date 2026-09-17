import type { FormSelectOption } from "@studio-v2/src/commonUiComponents/form/formTypes";
import type { ToolCatalogDto } from "@studio-v2/typeFiles/tools/toolCatalog";

const GROUP_LABELS: Record<string, string> = {
	call_control: "通话控制",
	builtin: "引擎内置",
	character: "角色专属",
	plugin: "插件能力",
};

/** 将服务端目录与卡片草稿合并为表单选项；失效 id 只标错，不从草稿删除。 */
export function projectToolCatalogChoices(input: {
	catalog: ToolCatalogDto | null;
	storedIds: string[];
	mode: "inherit_free" | "allowlist" | "deny_all" | "";
}): {
	options: FormSelectOption[];
	effectiveToolIds: string[];
} {
	const catalogTools = input.catalog?.tools ?? [];
	const inheritedIds = catalogTools
		.filter(function (tool) {
			return tool.inheritByDefault && tool.selectable;
		})
		.map(function (tool) {
			return tool.toolId;
		});
	const effectiveToolIds = input.mode === "inherit_free"
		? inheritedIds
		: input.storedIds;
	const knownIds = new Set(catalogTools.map(function (tool) {
		return tool.toolId;
	}));
	const options: FormSelectOption[] = catalogTools.map(function (tool) {
		const provider = tool.sourceKind === "plugin"
			? ` · ${tool.providerDisplayName}`
			: "";
		return {
			value: tool.toolId,
			label: `${tool.displayName}${provider}${tool.selectable ? "" : "（不可用）"}`,
			group: GROUP_LABELS[tool.group],
			disabled: !tool.selectable,
		};
	});
	for (const toolId of input.storedIds) {
		if (knownIds.has(toolId)) continue;
		options.push({
			value: toolId,
			label: `${toolId}（插件不可用）`,
			group: "已失效配置",
			disabled: true,
		});
	}
	return { options, effectiveToolIds };
}
