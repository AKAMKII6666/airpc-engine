/**
	* 调试器电话壳 FC 声明。
	* 这类工具属于 Host 外层通话控制，不受剧情卡 toolPolicy 管辖。
	*/
import type { ToolDefinition } from "@airpc/rpg-engine";

export const DEBUGGER_SHELL_CONTROL_TOOLS: ToolDefinition[] = [{
	toolId: "request_hangup",
	displayName: "请求主动挂机",
	description:
		"当角色在剧情或对话中应主动结束电话时调用。" +
		"调用后电话壳会收到挂断请求；不要把主动挂机只写成普通对白。",
	inputSchema: {
		type: "object",
		properties: {
			reason: {
				type: "string",
				description: "可选，角色主动挂机的简短原因，供调试日志查看。",
			},
		},
		additionalProperties: false,
	},
	allowedCardKinds: ["free", "story", "schedule", "voicemail"],
	allowedInPlayback: false,
	behavior: "session_local",
}];

export function isDebuggerShellControlTool(toolId: string): boolean {
	return DEBUGGER_SHELL_CONTROL_TOOLS.some(function (tool) {
		return tool.toolId === toolId;
	});
}

export function listDebuggerShellControlTools(): ToolDefinition[] {
	return [...DEBUGGER_SHELL_CONTROL_TOOLS];
}

export function buildShellControlInstruction(): string {
	return [
		"[phone-shell-controls]",
		"- request_hangup: 当你作为当前角色决定主动挂断电话时调用。",
		"- 用户明确告别、结束通话或表示要挂断（如“拜拜”“再见”“先挂了”“晚安”“就这样”）时，若没有同时提出新的业务请求，必须调用 request_hangup。",
		"- 已经成功登记过提醒、回电、记忆或其它业务工具后，用户只是告别时，不要重复调用业务工具；应调用 request_hangup。",
		"- 调用 shell-control 工具后，仍用一句很短的角色口吻收尾，不解释工具调用。",
	].join("\n");
}
