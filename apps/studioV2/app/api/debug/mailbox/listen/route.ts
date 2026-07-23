/**
	* POST /api/debug/mailbox/listen — 模拟听完：mailbox_open beginCall → endCall。
	*/
import {
	isEngineError,
	type EngineHost,
	type ResolveResult,
} from "@airpc/rpg-engine";
import {
	apiFail,
	apiOk,
	httpStatusForCode,
} from "@studio-v2/src/utils/server/http/apiResponse.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { projectMailboxSnapshot } from "@studio-v2/src/utils/server/debugger/mailboxProject.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";

type ListenBody = {
	userId?: string;
	voicemailId?: string;
	cardId?: string;
	packageId?: string;
	agentId?: string;
};

function parseListenBody(body: ListenBody): {
	ok: true;
	userId: string;
	voicemailId: string;
	cardId?: string;
	agentId?: string;
} | { ok: false; message: string } {
	const userId = body.userId;
	const voicemailId = body.voicemailId;
	if (!userId || !isValidUserId(userId)) {
		return { ok: false, message: "userId required" };
	}
	if (!voicemailId || typeof voicemailId !== "string") {
		return { ok: false, message: "voicemailId required" };
	}
	return {
		ok: true,
		userId,
		voicemailId,
		cardId: typeof body.cardId === "string" ? body.cardId : undefined,
		agentId: typeof body.agentId === "string" ? body.agentId : undefined,
	};
}

async function resolveSlotTargets(
	host: EngineHost,
	userId: string,
	voicemailId: string,
	overrides: { cardId?: string; agentId?: string },
): Promise<
	| { ok: true; agentId: string; cardId: string }
	| { ok: false; response: Response }
> {
	const profile = await host.ensureProfile(userId);
	const slots = Array.isArray(profile.telephony?.voicemails)
		? profile.telephony.voicemails
		: [];
	const slot = slots.find(function (item) {
		return item.id === voicemailId;
	});
	if (!slot) {
		return {
			ok: false,
			response: apiFail("NOT_FOUND", `voicemail not found: ${voicemailId}`, 404),
		};
	}
	const agentId = overrides.agentId || slot.agentId;
	const cardId =
		overrides.cardId ||
		(typeof slot.cardId === "string" ? slot.cardId : "") ||
		"";
	if (!cardId) {
		return {
			ok: false,
			response: apiFail("VALIDATION_FAILED", "cardId missing on slot"),
		};
	}
	return { ok: true, agentId, cardId };
}

async function runMailboxListenSession(
	host: EngineHost,
	userId: string,
	resolved: ResolveResult,
): Promise<
	| { ok: true; sessionId: string; selectedExitId: string; exitTitle: string }
	| { ok: false; response: Response }
> {
	const session = await host.beginCall(userId, resolved, {
		channel: "manual",
	});
	if (isEngineError(session)) {
		return {
			ok: false,
			response: apiFail(
				session.code,
				session.message,
				httpStatusForCode(session.code),
			),
		};
	}
	host.completePlayback(session.sessionId);
	const end = await host.endCall(session.sessionId, {
		flags: {
			answered_completed: true,
			playback_completed: true,
			voicemail_listened: true,
		},
		completedBeats: [],
		missedRequiredBeats: [],
	});
	if (isEngineError(end)) {
		return {
			ok: false,
			response: apiFail(end.code, end.message, httpStatusForCode(end.code)),
		};
	}
	const exitTitle =
		(typeof end.session.selectedExit?.reason === "string" &&
			end.session.selectedExit.reason) ||
		end.selectedExitId ||
		"(无出口)";
	return {
		ok: true,
		sessionId: session.sessionId,
		selectedExitId: end.selectedExitId ?? "",
		exitTitle,
	};
}

export async function POST(req: Request): Promise<Response> {
	try {
		const parsed = parseListenBody((await req.json()) as ListenBody);
		if (!parsed.ok) {
			return apiFail("VALIDATION_FAILED", parsed.message);
		}
		const host = await getStudioV2EngineHost();
		const targets = await resolveSlotTargets(
			host,
			parsed.userId,
			parsed.voicemailId,
			{ cardId: parsed.cardId, agentId: parsed.agentId },
		);
		if (!targets.ok) return targets.response;

		const resolved = await host.resolveAsync(parsed.userId, {
			kind: "mailbox_open",
			agentId: targets.agentId,
			voicemailId: parsed.voicemailId,
			cardId: targets.cardId,
		});
		if (isEngineError(resolved)) {
			return apiFail(
				resolved.code,
				resolved.message,
				httpStatusForCode(resolved.code),
				resolved.details,
			);
		}

		const listened = await runMailboxListenSession(
			host,
			parsed.userId,
			resolved,
		);
		if (!listened.ok) return listened.response;

		const after = await host.ensureProfile(parsed.userId);
		return apiOk({
			sessionId: listened.sessionId,
			selectedExitId: listened.selectedExitId,
			exitTitle: listened.exitTitle,
			mailbox: projectMailboxSnapshot(parsed.userId, after),
		});
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
