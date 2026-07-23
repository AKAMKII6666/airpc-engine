/**
	* POST /api/debug/mailbox/seed — 注入一条 unread 测试留言（仅调试）。
	* body: { userId, packageId?, agentId?, cardId? }
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

type SeedBody = {
	userId?: string;
	packageId?: string;
	agentId?: string;
	cardId?: string;
};

export async function POST(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as SeedBody;
		const userId = body.userId;
		if (!userId || !isValidUserId(userId)) {
			return apiFail("VALIDATION_FAILED", "userId required");
		}
		const packageId =
			(typeof body.packageId === "string" && body.packageId) ||
			"wrong_number_act1";
		const agentId =
			(typeof body.agentId === "string" && body.agentId) || "lanxing";
		const cardId =
			(typeof body.cardId === "string" && body.cardId) || "lanxing_voicemail";

		const host = await getStudioV2EngineHost();
		const profile = await host.ensureProfile(userId);
		if (!profile.telephony) profile.telephony = {};
		if (!Array.isArray(profile.telephony.voicemails)) {
			profile.telephony.voicemails = [];
		}
		const id = `vm_debug_${Date.now()}`;
		const nowIso = new Date().toISOString();
		profile.telephony.voicemails.push({
			id,
			agentId,
			cardId,
			packageId,
			status: "unread",
			text: "（调试注入）喂？是我，澜星。可以叫我澜星姐姐。电话号码 2267070。",
			createdAt: nowIso,
		});
		await host.saveProfile(userId, "manual");

		const after = await host.ensureProfile(userId);
		return apiOk(projectMailboxSnapshot(userId, after));
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
