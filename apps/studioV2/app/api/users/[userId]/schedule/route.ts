/**
	* GET/POST /api/users/[userId]/schedule?agentId=
	* 读写 Profile.schedule.intents（按 agentId 过滤）；不碰 user 段。
	*/
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	deleteAgentScheduleIntent,
	listAgentScheduleIntents,
	upsertAgentScheduleIntent,
} from "@studio-v2/src/utils/server/users/scheduleFs.server";

type RouteCtx = { params: Promise<{ userId: string }> };

function readAgentId(req: Request): string {
	const url = new URL(req.url);
	return url.searchParams.get("agentId")?.trim() ?? "";
}

export async function GET(
	req: Request,
	ctx: RouteCtx,
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const agentId = readAgentId(req);
		if (!agentId) {
			return apiFail("VALIDATION_FAILED", "agentId required");
		}
		const data = await listAgentScheduleIntents(userId, agentId);
		return apiOk(data);
	} catch (err) {
		const code =
			err && typeof err === "object" && "code" in err
				? String((err as { code: string }).code)
				: "ENGINE_INTERNAL";
		return apiFail(
			code,
			err instanceof Error ? err.message : String(err),
			httpStatusForCode(code),
		);
	}
}

export async function POST(
	req: Request,
	ctx: RouteCtx,
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const agentId = readAgentId(req);
		if (!agentId) {
			return apiFail("VALIDATION_FAILED", "agentId required");
		}
		const body = (await req.json()) as { intent?: unknown };
		const intent = await upsertAgentScheduleIntent(
			userId,
			agentId,
			body.intent,
		);
		return apiOk({ intent });
	} catch (err) {
		const code =
			err && typeof err === "object" && "code" in err
				? String((err as { code: string }).code)
				: "ENGINE_INTERNAL";
		return apiFail(
			code,
			err instanceof Error ? err.message : String(err),
			httpStatusForCode(code),
		);
	}
}

export async function DELETE(
	req: Request,
	ctx: RouteCtx,
): Promise<Response> {
	try {
		const { userId } = await ctx.params;
		const agentId = readAgentId(req);
		const url = new URL(req.url);
		const intentId = url.searchParams.get("intentId")?.trim() ?? "";
		if (!agentId) {
			return apiFail("VALIDATION_FAILED", "agentId required");
		}
		if (!intentId) {
			return apiFail("VALIDATION_FAILED", "intentId required");
		}
		await deleteAgentScheduleIntent(userId, agentId, intentId);
		return apiOk({ ok: true });
	} catch (err) {
		const code =
			err && typeof err === "object" && "code" in err
				? String((err as { code: string }).code)
				: "ENGINE_INTERNAL";
		return apiFail(
			code,
			err instanceof Error ? err.message : String(err),
			httpStatusForCode(code),
		);
	}
}
