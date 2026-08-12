/**
	* 调试器 LLM tools adapter：引擎中性 ToolDefinition → OpenAI-compatible tools。
	*/
import type { ToolDefinition } from "@airpc/rpg-engine";

export type OpenAiCompatibleTool = {
	/** OpenAI-compatible 工具类型；当前只支持 function */
	type: "function";
	/** 函数声明；由模型按 name/parameters 生成 tool call */
	function: {
		/** toolId 映射出的函数名 */
		name: string;
		/** 面向模型的触发说明 */
		description: string;
		/** JSON Schema 参数；原样来自引擎 ToolDefinition.inputSchema */
		parameters: unknown;
	};
};

/** 将单个引擎工具定义转成 OpenAI-compatible function tool */
export function toolDefinitionToOpenAiTool(
	tool: ToolDefinition,
): OpenAiCompatibleTool {
	return {
		type: "function",
		function: {
			name: tool.toolId,
			description: tool.description,
			parameters: tool.inputSchema,
		},
	};
}

/** 批量转换本通可用工具，保持引擎 resolveToolPolicy 后的顺序 */
export function toolDefinitionsToOpenAiTools(
	tools: readonly ToolDefinition[],
): OpenAiCompatibleTool[] {
	return tools.map(toolDefinitionToOpenAiTool);
}
