/**
	* /api/prompt-preview 旁路：预览请求体字段校验。
	*/
import { apiFail } from "@studio-v2/src/utils/server/http/apiResponse.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";

export type PreviewBody = {
	userId?: unknown;
	callDirection?: unknown;
	localHour?: unknown;
	packageId?: unknown;
	card?: unknown;
};

export type PreviewInput = {
	userId: string;
	callDirection: "inbound" | "outbound";
	localHour: number;
	packageId?: string;
	card: unknown;
};

type Fail = { ok: false; code: string; message: string; status: number };

/** 校验 userId 非空且格式合法。 */
function readUserId(raw: unknown): { ok: true; userId: string } | Fail {
	const userId = typeof raw === "string" ? raw.trim() : "";
	if (!userId || !isValidUserId(userId)) {
		return {
			ok: false,
			code: "USER_REQUIRED",
			message: "valid userId required",
			status: 403,
		};
	}
	return { ok: true, userId };
}

/** 校验 callDirection 为 inbound|outbound。 */
function readCallDirection(
	raw: unknown,
): { ok: true; callDirection: "inbound" | "outbound" } | Fail {
	if (raw !== "inbound" && raw !== "outbound") {
		return {
			ok: false,
			code: "VALIDATION_FAILED",
			message: "callDirection must be inbound|outbound",
			status: 400,
		};
	}
	return { ok: true, callDirection: raw };
}

/** 校验 localHour 为有限数字（允许字符串数字）。 */
function readLocalHour(raw: unknown): { ok: true; localHour: number } | Fail {
	const localHour = typeof raw === "number" ? raw : Number(raw);
	if (!Number.isFinite(localHour)) {
		return {
			ok: false,
			code: "VALIDATION_FAILED",
			message: "localHour required",
			status: 400,
		};
	}
	return { ok: true, localHour };
}

/**
	* 组装首通提示词预览输入；任一字段失败时返回结构化错误（由 route 转 apiFail）。
	*/
export function readPreviewBody(
	body: PreviewBody,
): ({ ok: true } & PreviewInput) | Fail {
	const user = readUserId(body.userId);
	if (!user.ok) return user;
	const direction = readCallDirection(body.callDirection);
	if (!direction.ok) return direction;
	const hour = readLocalHour(body.localHour);
	if (!hour.ok) return hour;
	if (body.card === undefined || body.card === null) {
		return {
			ok: false,
			code: "VALIDATION_FAILED",
			message: "card required",
			status: 400,
		};
	}
	return {
		ok: true,
		userId: user.userId,
		callDirection: direction.callDirection,
		localHour: hour.localHour,
		packageId:
			typeof body.packageId === "string" ? body.packageId : undefined,
		card: body.card,
	};
}

/** 将 readPreviewBody 失败结果转为 Response（供 route 薄封装）。 */
export function previewFailResponse(fail: Fail): Response {
	return apiFail(fail.code, fail.message, fail.status);
}
