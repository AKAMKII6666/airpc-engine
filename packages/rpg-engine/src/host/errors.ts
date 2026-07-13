/**
 * 模块名称：引擎错误码
 */
export type EngineErrorCode =
  | "OK"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "USER_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT_ACTIVE_CALL"
  | "CHARACTER_NOT_DIALABLE"
  | "INVALID_PACKAGE_ID"
  | "STORY_LOCKED"
  | "NO_EXIT_MATCHED"
  | "SCHEMA_UNSUPPORTED"
  | "ENGINE_INTERNAL";

export interface EngineError {
  ok: false;
  code: EngineErrorCode;
  message: string;
  details?: unknown;
}

export function engineError(
  code: EngineErrorCode,
  message: string,
  details?: unknown,
): EngineError {
  return { ok: false, code, message, details };
}

export function isEngineError(value: unknown): value is EngineError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as EngineError).ok === false &&
    typeof (value as EngineError).code === "string"
  );
}
