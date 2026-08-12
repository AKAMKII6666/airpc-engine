/**
	* Host CallSession → 可用工具 DTO。
	*/
import {
	listToolsForCard,
	type CallSession,
	type ToolDefinition,
} from "@airpc/rpg-engine";
import { listDebuggerShellControlTools } from "@studio-v2/src/utils/server/debugger/shell/shellControlTools.server";

export type DebuggerAvailableToolView = {
	/** 引擎 toolId；等同 LLM function name */
	toolId: string;
	/** 工具展示名 */
	displayName: string;
	/** 工具行为；register_exit 不会在通话中直接执行 Effect */
	behavior: ToolDefinition["behavior"];
	/** 面向模型的触发说明 */
	description: string;
};

export function projectAvailableTools(
	session: CallSession,
): DebuggerAvailableToolView[] {
	return [
		...listToolsForCard(session.frozenCard),
		...listDebuggerShellControlTools(),
	].map(function (tool) {
		return {
			toolId: tool.toolId,
			displayName: tool.displayName,
			behavior: tool.behavior,
			description: tool.description,
		};
	});
}
