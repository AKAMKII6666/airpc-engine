/**
	* /api/debug/e2e/outbound-seed — 人工 E2E 外呼种子与链路验证。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import {
	seedDebuggerOutboundE2E,
	verifyDebuggerOutboundE2E,
	type SeedDebuggerOutboundE2EInput,
} from "@studio-v2/src/utils/server/debugger/e2e/outboundE2ESeed.server";

function handleOutboundSeedError(err: unknown): Response {
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

export async function GET(req: Request): Promise<Response> {
	try {
		const url = new URL(req.url);
		const verify = await verifyDebuggerOutboundE2E({
			userId: url.searchParams.get("userId") ?? "",
			intentId: url.searchParams.get("intentId") ?? undefined,
		});
		return apiOk({ verify });
	} catch (err) {
		return handleOutboundSeedError(err);
	}
}

export async function POST(req: Request): Promise<Response> {
	try {
		const seed = await seedDebuggerOutboundE2E(
			(await req.json()) as SeedDebuggerOutboundE2EInput,
		);
		return apiOk({ seed });
	} catch (err) {
		return handleOutboundSeedError(err);
	}
}
