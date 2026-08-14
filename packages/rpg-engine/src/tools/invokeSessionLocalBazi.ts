/**
 * session_local：白半仙八字排盘工具。
 */
import type { CallSession } from "../host/types.js";
import {
  computeBaziChart,
  COMPUTE_BAZI_CHART_TOOL_ID,
  type ComputeBaziChartArgs,
} from "./bazi/computeBaziChart.js";
import type { ToolInvokeResult } from "./types.js";

export function invokeSessionLocalBaziTool(input: {
  session: CallSession;
  toolId: string;
  args: Record<string, unknown>;
}): ToolInvokeResult {
  if (input.toolId !== COMPUTE_BAZI_CHART_TOOL_ID) {
    throw new Error(`unsupported bazi tool: ${input.toolId}`);
  }
  const localResult = computeBaziChart(input.args as unknown as ComputeBaziChartArgs);
  input.session.toolTrace.push({
    at: new Date().toISOString(),
    toolId: input.toolId,
    behavior: "session_local",
    status: localResult.status,
    calendarType:
      localResult.status === "ok" ? localResult.chart.calendarType : undefined,
    hourKnown:
      localResult.status === "ok" ? localResult.chart.hourKnown : undefined,
  });
  return {
    ok: true,
    behavior: "session_local",
    localResult: {
      ...localResult,
      instruction:
        "按 chart 用白半仙口吻做娱乐性解读；不可伪造排盘；不可断生死、疾病灾祸或替用户做重大决定；若 hourKnown=false，须说明缺少时柱。",
    },
  };
}
