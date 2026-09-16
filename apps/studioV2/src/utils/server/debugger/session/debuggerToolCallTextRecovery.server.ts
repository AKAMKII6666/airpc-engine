/**
	* 部分供应商在 tool_choice=required 时偶发把 FC 写成正文 XML（finish=stop）。
	* 调试器在进入 Host.invokeTool 前尽量回收成正式 toolCalls，避免 UI 露出原始标签。
	*/
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/llm/llmClient.server";

type RecoveredToolCall = {
	id: string;
	name: string;
	argumentsJson: string;
};

function parseParameterBlock(body: string): Record<string, string> {
	const args: Record<string, string> = {};
	const paramRe =
		/<parameter=([^\s>]+)>\s*([\s\S]*?)(?:<\/parameter>|(?=<parameter=)|(?=<\/function>)|$)/gi;
	let match: RegExpExecArray | null;
	while ((match = paramRe.exec(body)) !== null) {
		const key = match[1]?.trim();
		if (!key) continue;
		args[key] = (match[2] ?? "").trim();
	}
	return args;
}

/** 从助手正文里解析 Qwen 风格 <tool_call><function=…> 片段。 */
export function parseQwenXmlToolCallsFromText(text: string): RecoveredToolCall[] {
	const source = text.trim();
	if (!source.includes("<tool_call") && !source.includes("<function=")) {
		return [];
	}
	const calls: RecoveredToolCall[] = [];
	const fnRe =
		/<function=([^\s>]+)>([\s\S]*?)(?:<\/function>|(?=<function=)|(?=<\/tool_call>)|$)/gi;
	let match: RegExpExecArray | null;
	let index = 0;
	while ((match = fnRe.exec(source)) !== null) {
		const name = match[1]?.trim();
		if (!name) continue;
		const args = parseParameterBlock(match[2] ?? "");
		calls.push({
			id: `recovered_tool_${Date.now()}_${index}`,
			name,
			argumentsJson: JSON.stringify(args),
		});
		index += 1;
	}
	return calls;
}

export function stripQwenXmlToolCalls(text: string): string {
	return text
		.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, " ")
		.replace(/<function=[^\s>]+>[\s\S]*?(?:<\/function>|$)/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** 无结构化 toolCalls 时，尝试从正文 XML 回收；成功则清空/裁剪正文。 */
export function recoverToolCallsFromAssistantText(
	result: ServerLlmChatResult,
): ServerLlmChatResult {
	if (result.toolCalls.length > 0) return result;
	const recovered = parseQwenXmlToolCallsFromText(result.text);
	if (recovered.length === 0) return result;
	return {
		...result,
		text: stripQwenXmlToolCalls(result.text),
		toolCalls: recovered,
		finishReason:
			result.finishReason === "stop" || result.finishReason == null
				? "tool_calls"
				: result.finishReason,
	};
}
