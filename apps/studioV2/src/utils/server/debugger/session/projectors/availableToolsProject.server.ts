/**
	* Host CallSession → 可用工具 DTO。
	*/
import {
	listToolsForCard,
	projectToolResolutionTrace,
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
	/** 工具来源：global 或角色专属能力 */
	availability: string;
	/** 该工具是否来自当前角色 capabilities 声明 */
	declaredByCharacter: boolean;
	/** 工具最终开放原因；用于定位过滤过程 */
	resolutionReason: string;
};

export function projectAvailableTools(
	session: CallSession,
): DebuggerAvailableToolView[] {
	const trace = projectToolResolutionTrace(session.frozenCard, {
		characterDef: session.frozenCharacter,
	});
	const traceById = new Map(
		trace.items.map(function (item) {
			return [item.toolId, item];
		}),
	);
	return [
		...listToolsForCard(session.frozenCard, {
			characterDef: session.frozenCharacter,
		}),
		...listDebuggerShellControlTools(),
	].map(function (tool) {
		return {
			toolId: tool.toolId,
			displayName: tool.displayName,
			behavior: tool.behavior,
			description: tool.description,
			availability: traceById.get(tool.toolId)?.availability ?? "global",
			declaredByCharacter:
				traceById.get(tool.toolId)?.declaredByCharacter ?? false,
			resolutionReason: traceById.get(tool.toolId)?.reason ?? "exposed",
		};
	});
}
