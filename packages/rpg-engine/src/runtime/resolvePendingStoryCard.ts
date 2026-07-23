/**
 * 模块名称：Board pending → ResolveResult（含 voicemail 拒拨）
 * 模块说明：从 createEngineHost.resolve 拆出，降低 Host 组合函数规模。
 */
import { engineError, type EngineError } from "../host/errors.js";
import type { CallIntent, ResolveResult } from "../host/types.js";
import type { PlayerProfile } from "../schema/profile.js";
import { pickPendingForIntent } from "./pickPendingForUserDial.js";
import { rejectVoicemailAsDialCard } from "./voicemail/resolveMailboxOpen.js";
import {
	lookupCharacterSideCard,
	type WorkspaceState,
} from "../workspace/loadWorkspace.js";

export function resolvePendingStoryCard(input: {
	profile: PlayerProfile;
	workspace: WorkspaceState;
	agentId: string;
	kind: "user_dial" | "agent_outbound";
	intent: CallIntent;
}): ResolveResult | EngineError | null {
	const { profile, workspace: ws, agentId, kind, intent } = input;
	const pending = pickPendingForIntent(profile, agentId, kind, {
		resolveEntryMode(instance) {
			if (instance.entryMode) {
				return instance.entryMode;
			}
			return (
				lookupCharacterSideCard(
					ws,
					instance.packageId,
					instance.cardId,
				)?.entryMode ??
				ws.packages.get(instance.packageId)?.cards.get(instance.cardId)
					?.entryMode
			);
		},
	});
	if (!pending) {
		return null;
	}
	const card =
		lookupCharacterSideCard(ws, pending.packageId, pending.cardId) ??
		ws.packages.get(pending.packageId)?.cards.get(pending.cardId);
	if (!card) {
		return engineError(
			"NOT_FOUND",
			`card not loaded: ${pending.packageId}/${pending.cardId}; use resolveAsync`,
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
		packageId: pending.packageId,
		intent,
		card: structuredClone(card),
	};
}
