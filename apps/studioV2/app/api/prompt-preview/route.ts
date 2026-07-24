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
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";

type PreviewBody = {
	userId?: unknown;
	callDirection?: unknown;
	localHour?: unknown;
	packageId?: unknown;
	card?: unknown;
};

function readPreviewBody(body: PreviewBody):
	| { ok: true; userId: string; callDirection: "inbound" | "outbound"; localHour: number; packageId?: string; card: unknown }
	| { ok: false; code: string; message: string; status: number } {
	const userId = typeof body.userId === "string" ? body.userId.trim() : "";
	if (!userId || !isValidUserId(userId)) {
		return {
			ok: false,
			code: "USER_REQUIRED",
			message: "valid userId required",
			status: 403,
		};
	}
	if (body.callDirection !== "inbound" && body.callDirection !== "outbound") {
		return {
			ok: false,
			code: "VALIDATION_FAILED",
			message: "callDirection must be inbound|outbound",
			status: 400,
		};
	}
	const localHour =
		typeof body.localHour === "number"
			? body.localHour
			: Number(body.localHour);
	if (!Number.isFinite(localHour)) {
		return {
			ok: false,
			code: "VALIDATION_FAILED",
			message: "localHour required",
			status: 400,
		};
	}
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
		userId,
		callDirection: body.callDirection,
		localHour,
		packageId:
			typeof body.packageId === "string" ? body.packageId : undefined,
		card: body.card,
	};
}

export async function POST(req: Request): Promise<Response> {
	try {
		const parsed = readPreviewBody((await req.json()) as PreviewBody);
		if (!parsed.ok) {
			return apiFail(parsed.code, parsed.message, parsed.status);
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
