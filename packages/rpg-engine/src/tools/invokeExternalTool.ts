import Ajv, { type ValidateFunction } from "ajv";
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import type { CallSession, LogRecord } from "../host/types.js";
import type { RegisteredTool, ToolInvokeResult } from "./types.js";

const EXTERNAL_TOOL_TIMEOUT_MS = 10_000;
const EXTERNAL_RESULT_MAX_BYTES = 32 * 1024;
const argsValidator = new Ajv({ allErrors: true, strict: false });
const validatorCache = new WeakMap<object, ValidateFunction>();

function jsonResultOrError(value: unknown): unknown | EngineError {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return engineError(
        "VALIDATION_FAILED",
        "external tool result must be JSON serializable",
        { rule: "TOOL_RESULT_INVALID" },
      );
    }
    if (Buffer.byteLength(json, "utf8") > EXTERNAL_RESULT_MAX_BYTES) {
      return engineError(
        "VALIDATION_FAILED",
        "external tool result exceeds 32 KiB",
        { rule: "TOOL_RESULT_TOO_LARGE" },
      );
    }
    return JSON.parse(json) as unknown;
  } catch {
    return engineError(
      "VALIDATION_FAILED",
      "external tool result must be JSON serializable",
      { rule: "TOOL_RESULT_INVALID" },
    );
  }
}

async function invokeWithTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>(function (_resolve, reject) {
        timeout = setTimeout(function () {
          reject(new Error("external_tool_timeout"));
        }, EXTERNAL_TOOL_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function validateArgs(
  schema: unknown,
  args: Record<string, unknown>,
): EngineError | null {
  if (!schema || typeof schema !== "object") {
    return engineError(
      "ENGINE_INTERNAL",
      "external tool inputSchema must be an object",
    );
  }
  let validate = validatorCache.get(schema);
  try {
    if (!validate) {
      validate = argsValidator.compile(schema);
      validatorCache.set(schema, validate);
    }
  } catch (error) {
    return engineError(
      "ENGINE_INTERNAL",
      "external tool inputSchema is invalid",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
  if (validate(args)) return null;
  return engineError(
    "VALIDATION_FAILED",
    "external tool arguments do not match inputSchema",
    { rule: "TOOL_ARGS_INVALID", errors: validate.errors ?? [] },
  );
}

function writeAudit(input: {
  session: CallSession;
  registration: RegisteredTool;
  toolId: string;
  startedAt: number;
  status: string;
  pushLog: (record: LogRecord) => void;
}): void {
  input.pushLog({
    at: new Date().toISOString(),
    type: "tool.external_invoked",
    userId: input.session.userId,
    sessionId: input.session.sessionId,
    payload: {
      providerId: input.registration.source.providerId,
      sourceKind: input.registration.source.kind,
      toolId: input.toolId,
      durationMs: Date.now() - input.startedAt,
      status: input.status,
    },
  });
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === "external_tool_timeout";
}

function invocationError(toolId: string, error: unknown): EngineError {
  const timedOut = isTimeoutError(error);
  return engineError(
    "VALIDATION_FAILED",
    timedOut
      ? `external tool timed out: ${toolId}`
      : `external tool failed: ${toolId}`,
    { rule: timedOut ? "TOOL_TIMEOUT" : "TOOL_INVOKE_FAILED" },
  );
}

export async function invokeExternalTool(input: {
  session: CallSession;
  registration: RegisteredTool;
  toolId: string;
  args: Record<string, unknown>;
  pushLog: (record: LogRecord) => void;
}): Promise<ToolInvokeResult | EngineError> {
  if (!input.registration.invoke) {
    return engineError(
      "ENGINE_INTERNAL",
      `external tool has no invoke handler: ${input.toolId}`,
    );
  }
  const startedAt = Date.now();
  const argsError = validateArgs(
    input.registration.definition.inputSchema,
    input.args,
  );
  if (argsError) {
    writeAudit({ ...input, startedAt, status: "invalid_args" });
    return argsError;
  }
  let status = "ok";
  try {
    const value = await invokeWithTimeout(Promise.resolve(input.registration.invoke({
      sessionId: input.session.sessionId,
      userId: input.session.userId,
      agentId: input.session.resolve.agentId,
      chapterId: input.session.chapterId,
      cardId: input.session.resolve.cardId,
      args: input.args,
    })));
    const safeValue = jsonResultOrError(value);
    if (isEngineError(safeValue)) {
      status = "invalid_result";
      return safeValue;
    }
    input.session.toolTrace.push({
      at: new Date().toISOString(),
      toolId: input.toolId,
      behavior: "external",
      providerId: input.registration.source.providerId,
      status: "ok",
    });
    return { ok: true, behavior: "external", localResult: safeValue };
  } catch (error) {
    const result = invocationError(input.toolId, error);
    status = isTimeoutError(error) ? "timeout" : "error";
    return result;
  } finally {
    writeAudit({ ...input, startedAt, status });
  }
}
