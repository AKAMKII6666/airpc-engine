/**
 * 模块名称：Board pending → ResolveResult（含 voicemail 拒拨）
 * 模块说明：从 createEngineHost.resolve 拆出，降低 Host 组合函数规模。
 */
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import type { CallIntent, ResolveResult } from "../host/types.js";
import type {
	CallCardInstance,
	PlayerProfile,
} from "../schema/profile.js";
import { pickPendingForIntent } from "./pickPendingForUserDial.js";
import { rejectVoicemailAsDialCard } from "./voicemail/resolveMailboxOpen.js";
import {
	lookupCharacterSideCard,
	type WorkspaceState,
} from "../workspace/loadWorkspace.js";

function findAgentPendingByInstanceId(
	profile: PlayerProfile,
	agentId: string,
	instanceId: string,
): CallCardInstance | null {
	return (
		profile.callCards.board.byAgent[agentId]?.pending.find(function (item) {
			return item.instanceId === instanceId;
		}) ?? null
	);
}

/**
 * 接听壳层已派发的外呼：必须命中 event.instanceId。
 * 允许 missed（拒接/误标后仍可接听同一响铃），禁止回落 Free。
 */
function resolvePinnedOutboundInstance(
	profile: PlayerProfile,
	agentId: string,
	instanceId: string,
): CallCardInstance | EngineError {
	const pinned = findAgentPendingByInstanceId(profile, agentId, instanceId);
	if (!pinned) {
		return engineError(
			"NOT_FOUND",
			`outbound pending instance not found: ${instanceId}`,
		);
	}
	if (pinned.status === "active") {
		return engineError(
			"CONFLICT_ACTIVE_CALL",
			`outbound pending instance already active: ${instanceId}`,
		);
	}
	if (pinned.status !== "pending" && pinned.status !== "missed") {
		return engineError(
			"VALIDATION_FAILED",
			`outbound pending instance not answerable: ${pinned.status}`,
		);
	}
	return pinned;
}

export function resolvePendingStoryCard(input: {
	profile: PlayerProfile;
	workspace: WorkspaceState;
	agentId: string;
	kind: "user_dial" | "agent_outbound";
	intent: CallIntent;
}): ResolveResult | EngineError | null {
	const { profile, workspace: ws, agentId, kind, intent } = input;
	let pending: CallCardInstance | null = null;
	if (
		kind === "agent_outbound" &&
		intent.kind === "agent_outbound" &&
		typeof intent.instanceId === "string" &&
		intent.instanceId.trim() !== ""
	) {
		const pinned = resolvePinnedOutboundInstance(
			profile,
			agentId,
			intent.instanceId.trim(),
		);
		if (isEngineError(pinned)) {
			return pinned;
		}
		pending = pinned;
	} else {
		pending = pickPendingForIntent(profile, agentId, kind, {
			resolveEntryMode(instance) {
				if (instance.entryMode) {
					return instance.entryMode;
				}
				return (
					lookupCharacterSideCard(
						ws,
						instance.chapterId,
						instance.cardId,
					)?.entryMode ??
					ws.chapters.get(instance.chapterId)?.cards.get(instance.cardId)
						?.entryMode
				);
			},
		});
		if (!pending) {
			return null;
		}
	}
	const card =
		lookupCharacterSideCard(ws, pending.chapterId, pending.cardId) ??
		ws.chapters.get(pending.chapterId)?.cards.get(pending.cardId);
	if (!card) {
		return engineError(
			"NOT_FOUND",
			`card not loaded: ${pending.chapterId}/${pending.cardId}; use resolveAsync`,
		);
	}
	const voicemailReject = rejectVoicemailAsDialCard(card);
	if (voicemailReject) {
		return voicemailReject;
	}
	return {
		ok: true,
		source: "story_pending",
		instanceId: pending.instanceId,
		cardId: pending.cardId,
		agentId: pending.agentId,
		chapterId: pending.chapterId,
		intent,
		card: structuredClone(card),
	};
}
