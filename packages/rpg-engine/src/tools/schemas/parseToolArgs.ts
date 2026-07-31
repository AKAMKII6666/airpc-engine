/**
 * 模块名称：invoke 前 Zod 校验工具入参
 */
import { engineError, type EngineError } from "../../host/errors.js";
import { getToolInputSchema } from "./toolInputSchemas.js";

/**
 * 按 Registry Zod 校验 args；失败返回 VALIDATION_FAILED（含 issue 摘要）。
 * 成功返回可继续传给 expand / session_local 的对象。
 */
export function parseToolArgs(
  toolId: string,
  args: Record<string, unknown>,
): Record<string, unknown> | EngineError {
  const schema = getToolInputSchema(toolId);
  if (!schema) {
    return engineError(
      "VALIDATION_FAILED",
      `no input schema for toolId: ${toolId}`,
    );
  }
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .slice(0, 3)
      .map(function (issue) {
        const path = issue.path.length ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    return engineError(
      "VALIDATION_FAILED",
      `tool args invalid for ${toolId}: ${summary}`,
      { rule: "TOOL_ARGS" },
    );
  }
  return parsed.data as Record<string, unknown>;
}
