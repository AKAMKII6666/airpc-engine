/**
	* POST /api/prompt-preview — 首通提示词预览（编辑期观测，不建 CallSession）。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { previewFirstConnectPrompt } from "@studio-v2/src/utils/server/promptPreview/previewFirstConnectPrompt.server";
import {
	previewFailResponse,
	readPreviewBody,
	type PreviewBody,
} from "./route.helpers";

export async function POST(req: Request): Promise<Response> {
	try {
		const parsed = readPreviewBody((await req.json()) as PreviewBody);
		if (!parsed.ok) {
			return previewFailResponse(parsed);
		}
		const result = await previewFirstConnectPrompt({
			userId: parsed.userId,
			callDirection: parsed.callDirection,
			localHour: parsed.localHour,
			packageId: parsed.packageId,
			card: parsed.card,
		});
		return apiOk(result);
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		const code =
			err &&
			typeof err === "object" &&
			"code" in err &&
			typeof (err as { code: unknown }).code === "string"
				? (err as { code: string }).code
				: "ENGINE_INTERNAL";
		const message = err instanceof Error ? err.message : String(err);
		return apiFail(code, message, httpStatusForCode(code));
	}
}
