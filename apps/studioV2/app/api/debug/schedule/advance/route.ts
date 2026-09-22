/**
	* POST /api/debug/schedule/advance — 调试器推进 Host 调度时钟（E2E / 人工加速补打）。
	* 仅 Studio debug；引擎仍只接收 deltaMs。
	*/
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import {
	advanceScheduleClock,
	failFromUnknown,
	parseAdvanceBody,
	type AdvanceBody,
} from "./route.helpers";

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as AdvanceBody;
		const parsed = parseAdvanceBody(body);
		if (!parsed.ok) return parsed.response;
		const host = await getStudioV2EngineHost();
		return await advanceScheduleClock(host, parsed.params);
	} catch (err) {
		return failFromUnknown(err);
	}
}
