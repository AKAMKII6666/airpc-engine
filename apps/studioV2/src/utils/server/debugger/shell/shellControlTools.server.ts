/**
	* 调试器电话壳 FC 声明。
	* 这类工具属于 Host 外层通话控制，不受剧情卡 toolPolicy 管辖。
	*/
import type { ToolDefinition } from "@airpc/rpg-engine";

export const DEBUGGER_SHELL_CONTROL_TOOLS: ToolDefinition[] = [{
	toolId: "request_hangup",
	displayName: "请求主动挂机",
	description:
		"当角色在本通电话中应主动结束通话时调用。" +
		"只根据本通用户已说的话判断；不要因上一通告别/挂机记录而调用。" +
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
		"- request_hangup: 当你作为当前角色决定主动挂断本通电话时调用。",
		"- 触发条件只看本通 chatTurns：用户在本通明确告别、结束通话或表示要挂断（如“拜拜”“再见”“先挂了”“晚安”“就这样”），且没有同时提出新的业务请求时，必须调用 request_hangup。",
		"- 禁止：把上一通的告别/拒绝/挂机意图当作本通用户刚说的话（含因此调用 request_hangup）。",
		"- 禁止：把上一通任何 FC 调用指令当成当前必须调用某 FC 的指令；本通工具只服从本通对话与本通纪律。",
		"- 开场首轮（用户尚未在本通开口）禁止仅因上一通余温调用 request_hangup；应先按当前卡开场说话。",
		"- 已经成功登记过提醒、回电、记忆或其它业务工具后，用户在本通只是告别时，不要重复调用业务工具；应调用 request_hangup。",
		"- 调用 shell-control 工具后，仍用一句很短的角色口吻收尾，不解释工具调用。",
		"[tool-discipline]",
		"- 本通已开放 function calling。记名(record_user_name)、预约回电(schedule_reminder_call)、搜记忆(search_memory)、主动挂机(request_hangup)等：满足本通触发条件时必须发出 tool_calls；禁止只输出对白假装已办理。",
		"- 先口头确认再调工具可以，但不能停在口头；同轮内必须完成对应 tool_call。",
	].join("\n");
}
