/**
	* POST /api/debug/call/chapter-entry-ring — 编辑器章节开局响铃（outbound delay=0）。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	ringDebuggerChapterEntry,
	type RingDebuggerChapterEntryInput,
} from "@studio-v2/src/utils/server/debugger/session/debuggerChapterEntryRing.server";

function handleError(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	const coded = err as { code?: unknown; status?: unknown; message?: unknown };
	const status = typeof coded.status === "number" ? coded.status : 500;
	const code = typeof coded.code === "string" ? coded.code : "ENGINE_INTERNAL";
	const message =
		typeof coded.message === "string" ? coded.message : String(err);
	return apiFail(code, message, status);
}

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as RingDebuggerChapterEntryInput;
		const ring = await ringDebuggerChapterEntry(body);
		if (ring.mode === "simulate_start") {
			return apiOk({ ring });
		}
		return apiOk({
			ring: {
				mode: "outbound_ring" as const,
				cardId: ring.cardId,
				agentId: ring.agentId,
				incomingEventId: ring.verify.incomingEventId,
			},
		});
	} catch (err) {
		return handleError(err);
	}
}
