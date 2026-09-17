/** E2E-only: 伪造 FC 仍必须经过 Host.invokeTool 策略门。 */
import { apiFail, apiOk } from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
	if (process.env.AIRPC_E2E !== "1") {
		return apiFail("NOT_FOUND", "not found", 404);
	}
	const body = (await req.json()) as {
		sessionId?: unknown;
		toolId?: unknown;
		args?: unknown;
	};
	if (typeof body.sessionId !== "string" || typeof body.toolId !== "string") {
		return apiFail("VALIDATION_FAILED", "sessionId and toolId required", 400);
	}
	const args = body.args && typeof body.args === "object" && !Array.isArray(body.args)
		? body.args as Record<string, unknown>
		: {};
	const host = await getStudioV2EngineHost();
	const result = await host.invokeTool(body.sessionId, body.toolId, args);
	return apiOk({ result });
}
