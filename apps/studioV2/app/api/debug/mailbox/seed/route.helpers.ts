/**
	* /api/debug/mailbox/seed 旁路：body 归一与 unread 留言注入。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import {
	apiFail,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import type { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";

export type SeedBody = {
	userId?: string;
	packageId?: string;
	agentId?: string;
	cardId?: string;
};

export type SeedFields = {
	userId: string;
	packageId: string;
	agentId: string;
	cardId: string;
};

type StudioHost = Awaited<ReturnType<typeof getStudioV2EngineHost>>;

/** 将 catch 未知错误归一为 apiFail Response。 */
export function failFromUnknown(err: unknown): Response {
	if (isEngineError(err)) {
		return apiFail(err.code, err.message, httpStatusForCode(err.code));
	}
	return apiFail(
		"ENGINE_INTERNAL",
		err instanceof Error ? err.message : String(err),
		500,
	);
}

/**
	* 校验 userId，并对 packageId/agentId/cardId 填调试默认值。
	*/
export function resolveSeedFields(
	body: SeedBody,
):
	| { ok: true; fields: SeedFields }
	| { ok: false; response: Response } {
	const userId = body.userId;
	if (!userId || !isValidUserId(userId)) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "userId required"),
		};
	}
	return {
		ok: true,
		fields: {
			userId,
			packageId:
				typeof body.packageId === "string" && body.packageId
					? body.packageId
					: "wrong_number_act1",
			agentId:
				typeof body.agentId === "string" && body.agentId
					? body.agentId
					: "lanxing",
			cardId:
				typeof body.cardId === "string" && body.cardId
					? body.cardId
					: "lanxing_voicemail",
		},
	};
}

/**
	* 向 Profile.telephony.voicemails 注入一条 unread 调试留言并 saveProfile。
	*/
export async function injectDebugVoicemail(
	host: StudioHost,
	fields: SeedFields,
): Promise<void> {
	const profile = await host.ensureProfile(fields.userId);
	if (!profile.telephony) profile.telephony = {};
	if (!Array.isArray(profile.telephony.voicemails)) {
		profile.telephony.voicemails = [];
	}
	const id = `vm_debug_${Date.now()}`;
	const nowIso = new Date().toISOString();
	profile.telephony.voicemails.push({
		id,
		agentId: fields.agentId,
		cardId: fields.cardId,
		packageId: fields.packageId,
		status: "unread",
		text: "（调试注入）喂？是我，澜星。可以叫我澜星姐姐。电话号码 2267070。",
		createdAt: nowIso,
	});
	await host.saveProfile(fields.userId, "manual");
}
