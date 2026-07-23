/**
	* GET /api/debug/mailbox?userId= — 读 Profile.telephony.voicemails + 未读推导。
	* POST body 亦可带 userId（与 query 二选一）；仅调试器，不改卡。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { projectMailboxSnapshot } from "@studio-v2/src/utils/server/debugger/mailboxProject.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";

function readUserId(req: Request): string | null {
	const url = new URL(req.url);
	const q = url.searchParams.get("userId");
	if (q && isValidUserId(q)) return q;
	return null;
}

export async function GET(req: Request): Promise<Response> {
	try {
		const userId = readUserId(req);
		if (!userId) {
			return apiFail("VALIDATION_FAILED", "userId query required");
		}
		const host = await getStudioV2EngineHost();
		const profile = await host.ensureProfile(userId);
		return apiOk(projectMailboxSnapshot(userId, profile));
	} catch (err) {
		if (isEngineError(err)) {
			return apiFail(err.code, err.message, httpStatusForCode(err.code));
		}
		return apiFail(
			"ENGINE_INTERNAL",
			err instanceof Error ? err.message : String(err),
			500,
		);
	}
}
