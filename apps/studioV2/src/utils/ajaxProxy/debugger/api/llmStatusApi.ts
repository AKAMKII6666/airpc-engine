/**
	* 调试器大模型状态 BFF ajax（Client）。
	* 只读脱敏状态；浏览器不接触 API Key。
	*/
import { parseStudioApiJson } from "@studio-v2/src/utils/ajaxHelper/studioApiClient";
import type { DebuggerLlmPublicStatus } from "@studio-v2/typeFiles/debugger/llmStatus";

export type DebuggerLlmStatusData = {
	status: DebuggerLlmPublicStatus;
};

/** GET /api/debug/llm/status */
export async function fetchDebuggerLlmStatus(): Promise<DebuggerLlmPublicStatus> {
	const res = await fetch("/api/debug/llm/status");
	const data = await parseStudioApiJson<DebuggerLlmStatusData>(res);
	return data.status;
}
