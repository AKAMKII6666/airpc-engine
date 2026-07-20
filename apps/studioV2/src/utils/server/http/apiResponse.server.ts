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

/** 将引擎 / 门面错误码映射到 HTTP 状态 */
export function httpStatusForCode(code: string): number {
	switch (code) {
		case "OK":
			return 200;
		case "VALIDATION_FAILED":
		case "INVALID_PACKAGE_ID":
			return 400;
		case "UNAUTHORIZED":
			return 401;
		case "USER_REQUIRED":
			return 403;
		case "NOT_FOUND":
			return 404;
		case "CONFLICT_ACTIVE_CALL":
		case "CHARACTER_NOT_DIALABLE":
		case "STORY_LOCKED":
			return 409;
		case "NO_EXIT_MATCHED":
		case "SCHEMA_UNSUPPORTED":
			return 422;
		default:
			return 500;
	}
}
