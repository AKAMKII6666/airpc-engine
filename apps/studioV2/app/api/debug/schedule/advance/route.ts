/**
	* POST /api/debug/schedule/advance — 调试器推进 Host 调度时钟（E2E / 人工加速补打）。
	* 仅 Studio debug；引擎仍只接收 deltaMs。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

type AdvanceBody = {
	userId?: string;
	/** 推进毫秒；缺省 3 分钟，覆盖第一幕 2 分钟补打 */
	deltaMs?: number;
	/** next=推进到下一 intent；缺省按 deltaMs */
	mode?: "delta" | "next";
};

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as AdvanceBody;
		const userId = typeof body.userId === "string" ? body.userId.trim() : "";
		if (userId === "") {
			return apiFail("VALIDATION", "userId_required", 400);
		}
		const rawDelta = body.deltaMs;
		const deltaMs =
			typeof rawDelta === "number" && Number.isFinite(rawDelta) && rawDelta > 0
				? Math.floor(rawDelta)
				: 3 * 60_000;
		const host = await getStudioV2EngineHost();
		await host.ensureProfile(userId);
		const mode = body.mode === "next" ? "next" : "delta";
		const fired =
			mode === "next"
				? host.advanceClockToNextIntent(userId)
				: host.advanceClock(userId, deltaMs);
		if (isEngineError(fired)) {
			return apiFail(fired.code, fired.message, httpStatusForCode(fired.code));
		}
		const incoming = host.listIncomingCallEvents(userId);
		writeStudioLog("debugger", "info", {
			event: "debugger.schedule.advance",
			userId,
			message: `advanced schedule clock by ${deltaMs}ms`,
			payload: {
				deltaMs,
				firedCount: fired.length,
				pendingIncomingCount: incoming.length,
			},
		});
		return apiOk({
			userId,
			deltaMs,
			firedCount: fired.length,
			pendingIncomingCount: incoming.length,
			incomingCalls: incoming,
		});
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		const message = err instanceof Error ? err.message : String(err);
		return apiFail("ENGINE_INTERNAL", message, 500);
	}
}
