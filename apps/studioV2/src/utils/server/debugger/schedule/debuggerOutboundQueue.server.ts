/**
	* Debugger outbound queue primitive shared by product flows and E2E fixtures.
	* It stages a linked Board pending + once intent on the Host-owned Profile;
	* the caller owns the save/tick transaction and its domain-specific logging.
	*/
import { randomUUID } from "node:crypto";
import {
	isEngineError,
	type EngineHost,
	type PlayerProfile,
} from "@airpc/rpg-engine";

type PendingBoardEntry =
	PlayerProfile["callCards"]["board"]["byAgent"][string]["pending"][number];

export type StageDebuggerOutboundInput = {
	userId: string;
	agentId: string;
	chapterId: string;
	cardId: string;
	delayMs: number;
	topicHint?: string;
	intentIdPrefix: string;
	priority: number;
	/** Remove stale rows owned by this flow before adding the replacement. */
	replaceExisting?: "agent" | "target";
};

export type StagedDebuggerOutbound = {
	intentId: string;
	instanceId: string;
	clockMs: number;
	fireAtMs: number;
};

function ensureSchedule(
	profile: PlayerProfile,
): NonNullable<PlayerProfile["schedule"]> {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	if (!Array.isArray(profile.schedule.intents)) {
		profile.schedule.intents = [];
	}
	return profile.schedule;
}

function ensureBoard(
	profile: PlayerProfile,
	agentId: string,
): { pending: PendingBoardEntry[] } {
	const byAgent = profile.callCards.board.byAgent;
	if (!byAgent[agentId]) {
		byAgent[agentId] = { pending: [] };
	}
	return byAgent[agentId]!;
}

function matchesReplacement(
	raw: unknown,
	input: StageDebuggerOutboundInput,
): boolean {
	const row = raw as {
		intentId?: unknown;
		agentId?: unknown;
		chapterId?: unknown;
		cardId?: unknown;
	} | null;
	if (
		typeof row?.intentId !== "string" ||
		!row.intentId.startsWith(input.intentIdPrefix) ||
		row.agentId !== input.agentId
	) {
		return false;
	}
	return (
		input.replaceExisting === "agent" ||
		(row.chapterId === input.chapterId && row.cardId === input.cardId)
	);
}

function removeReplacedRows(
	profile: PlayerProfile,
	input: StageDebuggerOutboundInput,
): void {
	if (!input.replaceExisting) return;
	const board = profile.callCards.board.byAgent[input.agentId];
	if (board) {
		board.pending = board.pending.filter(function (item) {
			if (!item.scheduledIntentId?.startsWith(input.intentIdPrefix)) {
				return true;
			}
			return !(
				input.replaceExisting === "agent" ||
				(item.chapterId === input.chapterId && item.cardId === input.cardId)
			);
		});
	}
	const schedule = ensureSchedule(profile);
	schedule.intents = schedule.intents.filter(
		(raw) => !matchesReplacement(raw, input),
	);
}

function assertStageInput(input: StageDebuggerOutboundInput): void {
	if (
		!Number.isFinite(input.delayMs) ||
		input.delayMs < 0 ||
		input.intentIdPrefix.trim() === ""
	) {
		throw Object.assign(new Error("invalid debugger outbound queue input"), {
			code: "VALIDATION_FAILED",
			status: 400,
		});
	}
}

/** Stage one linked outbound intent without saving or advancing the clock. */
export async function stageDebuggerOutbound(
	input: StageDebuggerOutboundInput,
	host: EngineHost,
): Promise<StagedDebuggerOutbound> {
	assertStageInput(input);
	const loaded = await host.preloadCard(input.chapterId, input.cardId);
	if (isEngineError(loaded)) throw loaded;
	const profile = await host.ensureProfile(input.userId);
	removeReplacedRows(profile, input);
	const schedule = ensureSchedule(profile);
	const nowIso = new Date().toISOString();
	const intentId = `${input.intentIdPrefix}${randomUUID()}`;
	const instanceId = randomUUID();
	ensureBoard(profile, input.agentId).pending.push({
		instanceId,
		cardId: input.cardId,
		chapterId: input.chapterId,
		agentId: input.agentId,
		status: "pending",
		entryMode: "either",
		activationHint: "outbound_auto",
		scheduledIntentId: intentId,
		priority: input.priority,
		createdAt: nowIso,
		updatedAt: nowIso,
	});
	const clockMs = schedule.clockMs ?? 0;
	const fireAtMs = clockMs + Math.floor(input.delayMs);
	schedule.intents.push({
		kind: "once",
		intentId,
		agentId: input.agentId,
		cardId: input.cardId,
		chapterId: input.chapterId,
		origin: "story_scheduled_call",
		topicHint: input.topicHint,
		fireAtMs,
		status: "pending",
		linkedInstanceId: instanceId,
		createdAt: nowIso,
	});
	return { intentId, instanceId, clockMs, fireAtMs };
}
