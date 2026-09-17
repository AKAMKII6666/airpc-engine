/** Authoritative, idempotent chapter-entry call coordination. */
import {
	isEngineError,
	type EngineHost,
	type IncomingCallShellEvent,
} from "@airpc/rpg-engine";
import { stageDebuggerOutbound } from "@studio-v2/src/utils/server/debugger/schedule/debuggerOutboundQueue.server";
import { findDebuggerChapterEntry } from "@studio-v2/src/utils/server/debugger/session/debuggerChapterEntry.server";
import { withDebuggerChapterEntryLock } from "@studio-v2/src/utils/server/debugger/session/debuggerChapterEntryLock.server";
import { projectDebuggerCallSession } from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";
import { pruneUnanswerableIncomingEvents } from "@studio-v2/src/utils/server/debugger/session/debuggerIncomingReconcile.server";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";
import { readDiskChapterBundle } from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";
import { isValidUserId } from "@studio-v2/src/utils/server/users/usersFs.server";
import type { DebuggerCallSessionView } from "./debuggerCallSessionProject.server";

export type RingDebuggerChapterEntryInput = {
	userId: string;
	chapterId: string;
	requestId?: string;
};

export type RingDebuggerChapterEntryView =
	| {
			mode: "outbound_ring";
			outcome: "created" | "reused_pending";
			cardId: string;
			agentId: string;
			incomingEventId: string;
	}
	| {
			mode: "simulate_start";
			outcome: "simulate_start";
			chapterId: string;
			cardId: string;
	}
	| {
			mode: "already_active";
			outcome: "already_active";
			session: DebuggerCallSessionView;
	}
	| {
			mode: "blocked";
			outcome: "blocked";
			reason: "other_incoming_pending";
			incomingEventId: string;
	};

type EntryTarget = {
	chapterId: string;
	cardId: string;
	agentId: string;
	entryMode: string | undefined;
};

const CHAPTER_ENTRY_INTENT_PREFIX = "debug_chapter_entry:";
const CHAPTER_ENTRY_PRIORITY = 1_000_000;

function requiredText(value: unknown, field: string): string {
	if (typeof value === "string" && value.trim() !== "") return value.trim();
	throw Object.assign(new Error(`${field} required`), {
		code: "VALIDATION_FAILED",
		status: 400,
	});
}

async function resolveEntryTarget(chapterId: string): Promise<EntryTarget> {
	const entry = await findDebuggerChapterEntry(chapterId);
	const bundle = await readDiskChapterBundle(entry.packageId, entry.chapterId);
	const card = bundle.cards.find((item) => item.cardId === entry.cardId);
	if (!card) {
		throw Object.assign(new Error("章节起始卡定义缺失"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	return {
		chapterId: entry.chapterId,
		cardId: entry.cardId,
		agentId: requiredText(card.ownerAgentId, "ownerAgentId"),
		entryMode: card.entryMode,
	};
}

function requestIdOf(input: RingDebuggerChapterEntryInput): string {
	return typeof input.requestId === "string" && input.requestId.trim() !== ""
		? input.requestId.trim()
		: "unspecified";
}

type OutboundRingInput = {
	host: EngineHost;
	userId: string;
	requestId: string;
	target: EntryTarget;
};

function projectPendingRing(
	incoming: readonly IncomingCallShellEvent[],
	target: EntryTarget,
): RingDebuggerChapterEntryView | null {
	const matching = incoming.find(
		(event) =>
			event.chapterId === target.chapterId &&
			event.cardId === target.cardId &&
			event.agentId === target.agentId,
	);
	if (matching) {
		return {
			mode: "outbound_ring",
			outcome: "reused_pending",
			cardId: matching.cardId,
			agentId: matching.agentId,
			incomingEventId: matching.eventId,
		};
	}
	const blocked = incoming[0];
	if (blocked) {
		return {
			mode: "blocked",
			outcome: "blocked",
			reason: "other_incoming_pending",
			incomingEventId: blocked.eventId,
		};
	}
	return null;
}

async function createOutboundRing(
	input: OutboundRingInput,
): Promise<RingDebuggerChapterEntryView> {
	const staged = await stageDebuggerOutbound(
		{
			userId: input.userId,
			agentId: input.target.agentId,
			chapterId: input.target.chapterId,
			cardId: input.target.cardId,
			delayMs: 0,
			topicHint: "chapter_entry_ring",
			intentIdPrefix: CHAPTER_ENTRY_INTENT_PREFIX,
			priority: CHAPTER_ENTRY_PRIORITY,
			replaceExisting: "target",
		},
		input.host,
	);
	const fired = input.host.advanceClock(input.userId, 0);
	if (isEngineError(fired)) throw fired;
	await input.host.saveProfile(input.userId, "autosave");
	const event = input.host
		.listIncomingCallEvents(input.userId)
		.find((item) => item.scheduleIntentId === staged.intentId);
	if (!event) {
		throw Object.assign(new Error("章节入口调度未派发来电"), {
			code: "ENGINE_INTERNAL",
			status: 500,
		});
	}
	writeStudioLog("debugger", "info", {
		event: "debugger.chapter_entry.created",
		userId: input.userId,
		agentId: input.target.agentId,
		chapterId: input.target.chapterId,
		cardId: input.target.cardId,
		message: "created chapter-entry incoming call",
		payload: {
			requestId: input.requestId,
			intentId: staged.intentId,
			incomingEventId: event.eventId,
		},
	});
	return {
		mode: "outbound_ring",
		outcome: "created",
		cardId: input.target.cardId,
		agentId: input.target.agentId,
		incomingEventId: event.eventId,
	};
}

async function ensureOutboundRing(
	input: OutboundRingInput,
): Promise<RingDebuggerChapterEntryView> {
	const active = input.host.getActiveSession(input.userId);
	if (active) {
		return {
			mode: "already_active",
			outcome: "already_active",
			session: projectDebuggerCallSession(active, null),
		};
	}
	const profile = await input.host.ensureProfile(input.userId);
	const incoming = pruneUnanswerableIncomingEvents(
		input.host,
		input.userId,
		profile,
		input.host.listIncomingCallEvents(input.userId),
	);
	return projectPendingRing(incoming, input.target) ?? createOutboundRing(input);
}

export async function ringDebuggerChapterEntry(
	input: RingDebuggerChapterEntryInput,
	host?: EngineHost,
): Promise<RingDebuggerChapterEntryView> {
	const userId = requiredText(input.userId, "userId");
	if (!isValidUserId(userId)) {
		throw Object.assign(new Error("userId required"), {
			code: "VALIDATION_FAILED",
			status: 400,
		});
	}
	const target = await resolveEntryTarget(requiredText(input.chapterId, "chapterId"));
	if (target.entryMode !== "outbound_auto") {
		return {
			mode: "simulate_start",
			outcome: "simulate_start",
			chapterId: target.chapterId,
			cardId: target.cardId,
		};
	}
	const activeHost = host ?? (await getStudioV2EngineHost());
	return withDebuggerChapterEntryLock(userId, () =>
		ensureOutboundRing({
			host: activeHost,
			userId,
			requestId: requestIdOf(input),
			target,
		}),
	);
}
