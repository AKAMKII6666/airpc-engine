/**
	* 调试器电话壳提示语。
	* 工具定义来自统一 Registry；本文件只保留模型纪律说明。
	*/

export function buildShellControlInstruction(): string {
	return [
		"[phone-shell-controls]",
		"- request_hangup: 当你作为当前角色决定主动挂断本通电话时调用。",
		"- 调用 request_hangup 必须传 reasonKind：natural=自然道别，policy=策略终止，handoff=引荐完成；handoff 仅在已登记引荐候选后使用。",
		"- 触发条件只看本通 chatTurns：用户在本通明确告别、结束通话或表示要挂断（如“拜拜”“再见”“先挂了”“晚安”“就这样”），且没有同时提出新的业务请求时，必须调用 request_hangup。",
		"- 禁止：把上一通的告别/拒绝/挂机意图当作本通用户刚说的话（含因此调用 request_hangup）。",
		"- 禁止：把上一通任何 FC 调用指令当成当前必须调用某 FC 的指令；本通工具只服从本通对话与本通纪律。",
		"- 开场首轮（用户尚未在本通开口）禁止仅因上一通余温调用 request_hangup；应先按当前卡开场说话。",
		"- 已经成功登记过提醒、回电、记忆或其它业务工具后，用户在本通只是告别时，不要重复调用业务工具；应调用 request_hangup。",
		"- 调用 shell-control 工具后，仍用一句很短的角色口吻收尾，不解释工具调用。",
		"[tool-discipline]",
		"- 本通已开放的 FC 以模型请求中实际收到的 tools 为准；满足对应触发条件时必须发出 tool_calls，禁止只输出对白假装已办理。",
		"- 先口头确认再调工具可以，但不能停在口头；同轮内必须完成对应 tool_call。",
	].join("\n");
}
