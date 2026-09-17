/**
 * 模块名称：统一工具调用入口
 * 模块说明：所有内置、电话壳与宿主注入工具均先经过冻结工具集与会话守卫。
 */
import { engineError, type EngineError } from "../host/errors.js";
import type { CallSession, LogRecord } from "../host/types.js";
import type { MemoryPort } from "../memory/types.js";
import { invokeExternalTool } from "./invokeExternalTool.js";
import {
  invokeShellControlRegisteredTool,
  type ShellControlInvoker,
} from "./invokeShellControlRegisteredTool.js";
import { invokeSessionTool } from "./invokeSessionLocal.js";
import { getRegisteredTool } from "./toolRegistry.js";
import type { ToolInvokeResult, ToolRegistry } from "./types.js";

export async function invokeRegisteredTool(input: {
  session: CallSession;
  toolId: string;
  args: Record<string, unknown>;
  memory: MemoryPort | null;
  registry: ToolRegistry;
  invokeShellControlTool: ShellControlInvoker;
  pushLog: (record: LogRecord) => void;
}): Promise<ToolInvokeResult | EngineError> {
  const registration = getRegisteredTool(input.registry, input.toolId);
  if (!registration) {
    return engineError(
      "VALIDATION_FAILED",
      `unknown toolId: ${input.toolId}`,
      { rule: "TOOL_UNKNOWN" },
    );
  }
  if (
    !input.session.frozenTools?.some(function (tool) {
      return tool.toolId === input.toolId;
    })
  ) {
    return engineError(
      "VALIDATION_FAILED",
      `tool not allowed on this card: ${input.toolId}`,
      { rule: "TOOL_POLICY" },
    );
  }
  const behavior = registration.definition.behavior;
  if (behavior === "register_exit" || behavior === "session_local") {
    return invokeSessionTool({ ...input, registry: input.registry });
  }
  if (behavior === "shell_control") {
    return invokeShellControlRegisteredTool({
      session: input.session,
      toolId: input.toolId,
      args: input.args,
      invokeShellControlTool: input.invokeShellControlTool,
    });
  }
  return invokeExternalTool({
    session: input.session,
    registration,
    toolId: input.toolId,
    args: input.args,
    pushLog: input.pushLog,
  });
}
