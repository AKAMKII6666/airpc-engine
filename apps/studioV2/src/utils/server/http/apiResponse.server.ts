/**
	* Studio V2 API JSON 响应助手（仅 route handler 使用）。
	*/
import { NextResponse } from "next/server";

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse {
	return NextResponse.json({ ok: true, data }, init);
}

export function apiFail(
	code: string,
	message: string,
	status = 400,
	details?: unknown,
): NextResponse {
	return NextResponse.json(
		{ ok: false, code, message, details },
		{ status },
	);
}

/** 引擎 / 门面错误码 → HTTP 状态；未列出的一律 500 */
const HTTP_STATUS_BY_CODE: Record<string, number> = {
	OK: 200,
	VALIDATION_FAILED: 400,
	INVALID_PACKAGE_ID: 400,
	PACKAGE_VALIDATION_FAILED: 422,
	UNAUTHORIZED: 401,
	USER_REQUIRED: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	CONFLICT_ACTIVE_CALL: 409,
	CHARACTER_NOT_DIALABLE: 409,
	STORY_LOCKED: 409,
	AGENT_POST_CALL_BUSY: 409,
	NO_EXIT_MATCHED: 422,
	SCHEMA_UNSUPPORTED: 422,
};

/** 将引擎 / 门面错误码映射到 HTTP 状态 */
export function httpStatusForCode(code: string): number {
	return HTTP_STATUS_BY_CODE[code] ?? 500;
}
