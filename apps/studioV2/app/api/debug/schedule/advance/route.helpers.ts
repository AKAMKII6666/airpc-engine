/**
	* /api/debug/schedule/advance 旁路：body 解析与时钟推进。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import type { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

export type AdvanceBody = {
	userId?: string;
	/** 推进毫秒；缺省 3 分钟，覆盖第一幕 2 分钟补打 */
	deltaMs?: number;
	/** next=推进到下一 intent；缺省按 deltaMs */
	mode?: "delta" | "next";
};

export type AdvanceParams = {
	userId: string;
	deltaMs: number;
	mode: "delta" | "next";
};

type StudioHost = Awaited<ReturnType<typeof getStudioV2EngineHost>>;

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	const message = err instanceof Error ? err.message : String(err);
	return apiFail("ENGINE_INTERNAL", message, 500);
}

/**
	* 解析推进请求：校验 userId，归一 deltaMs/mode。
	*/
export function parseAdvanceBody(
	body: AdvanceBody,
):
	| { ok: true; params: AdvanceParams }
	| { ok: false; response: Response } {
	const userId = typeof body.userId === "string" ? body.userId.trim() : "";
	if (userId === "") {
		return {
			ok: false,
			response: apiFail("VALIDATION", "userId_required", 400),
		};
	}
	const rawDelta = body.deltaMs;
	const deltaMs =
		typeof rawDelta === "number" && Number.isFinite(rawDelta) && rawDelta > 0
			? Math.floor(rawDelta)
			: 3 * 60_000;
	const mode = body.mode === "next" ? "next" : "delta";
	return { ok: true, params: { userId, deltaMs, mode } };
}

/**
	* 推进 Host 调度时钟并组装成功响应体；引擎错误时返回 apiFail。
	*/
export async function advanceScheduleClock(
	host: StudioHost,
	params: AdvanceParams,
): Promise<Response> {
	await host.ensureProfile(params.userId);
	const fired =
		params.mode === "next"
			? host.advanceClockToNextIntent(params.userId)
			: host.advanceClock(params.userId, params.deltaMs);
	if (isEngineError(fired)) {
		return apiFail(fired.code, fired.message, httpStatusForCode(fired.code));
	}
	const firedItems = Array.isArray(fired) ? fired : fired.fired;
	const advancedMs = Array.isArray(fired) ? params.deltaMs : fired.advancedMs;
	const incoming = host.listIncomingCallEvents(params.userId);
	writeStudioLog("debugger", "info", {
		event: "debugger.schedule.advance",
		userId: params.userId,
		message: `advanced schedule clock by ${advancedMs}ms`,
		payload: {
			deltaMs: advancedMs,
			firedCount: firedItems.length,
			pendingIncomingCount: incoming.length,
		},
	});
	return apiOk({
		userId: params.userId,
		deltaMs: advancedMs,
		firedCount: firedItems.length,
		pendingIncomingCount: incoming.length,
		incomingCalls: incoming,
	});
}
