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
import {
	matchesEntryModeForIntent,
	pickPendingForIntent,
} from "./pickPendingForUserDial.js";
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
	if (pinned.agentId !== agentId) {
		return engineError(
			"VALIDATION_FAILED",
			`outbound pending instance agent mismatch: ${pinned.agentId}`,
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

export interface PendingStoryCardInput {
	profile: PlayerProfile;
	workspace: WorkspaceState;
	agentId: string;
	kind: "user_dial" | "agent_outbound";
	intent: CallIntent;
}

function hasPinnedOutbound(input: PendingStoryCardInput): boolean {
	return (
		input.kind === "agent_outbound" &&
		input.intent.kind === "agent_outbound" &&
		typeof input.intent.instanceId === "string" &&
		input.intent.instanceId.trim() !== ""
	);
}

function resolveInstanceEntryMode(
	workspace: WorkspaceState,
	instance: CallCardInstance,
): string | undefined {
	if (instance.entryMode) return instance.entryMode;
	return (
		lookupCharacterSideCard(
			workspace,
			instance.chapterId,
			instance.cardId,
		)?.entryMode ??
		workspace.chapters.get(instance.chapterId)?.cards.get(instance.cardId)
			?.entryMode
	);
}

export function selectPendingStoryCardInstance(
	input: PendingStoryCardInput,
): CallCardInstance | EngineError | null {
	const { profile, workspace: ws, agentId, kind, intent } = input;
	if (hasPinnedOutbound(input) && intent.kind === "agent_outbound") {
		const pinned = resolvePinnedOutboundInstance(
			profile,
			agentId,
			intent.instanceId?.trim() ?? "",
		);
		if (isEngineError(pinned)) return pinned;
		if (!matchesEntryModeForIntent(resolveInstanceEntryMode(ws, pinned), kind)) {
			return engineError(
				"VALIDATION_FAILED",
				`outbound pending instance has incompatible entryMode: ${pinned.entryMode ?? "undefined"}`,
			);
		}
		return pinned;
	}
	return pickPendingForIntent(profile, agentId, kind, {
		resolveEntryMode(instance) {
			return resolveInstanceEntryMode(ws, instance);
		},
	});
}

export function resolvePendingStoryCard(
	input: PendingStoryCardInput,
): ResolveResult | EngineError | null {
	const { workspace: ws, intent } = input;
	const pending = selectPendingStoryCardInstance(input);
	if (isEngineError(pending) || pending === null) return pending;
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
