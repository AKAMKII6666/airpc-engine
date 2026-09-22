/**
	* /api/users 旁路：POST 新建用户体校验。
	*/
import {
	UserSchema,
	formatZodError,
	isEngineError,
	type User,
} from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	const code =
		typeof err === "object" && err && "code" in err
			? String((err as { code: string }).code)
			: "ENGINE_INTERNAL";
	return apiFail(
		code,
		err instanceof Error ? err.message : String(err),
		httpStatusForCode(code),
	);
}

/**
	* 校验新建用户 body.user：对象、userId 格式与 UserSchema。
	*/
export function parseCreateUserBody(
	body: { user?: unknown },
):
	| { ok: true; user: User }
	| { ok: false; response: Response } {
	if (!body.user || typeof body.user !== "object") {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "user object required"),
		};
	}
	const raw = body.user as { userId?: string };
	if (!raw.userId || typeof raw.userId !== "string") {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "userId required"),
		};
	}
	if (!isValidUserId(raw.userId)) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "userId 格式无效"),
		};
	}
	const parsed = UserSchema.safeParse(body.user);
	if (!parsed.success) {
		return {
			ok: false,
			response: apiFail(
				"VALIDATION_FAILED",
				formatZodError(parsed.error),
				400,
				{ issues: parsed.error.issues },
			),
		};
	}
	return { ok: true, user: parsed.data };
}
