/** Reconcile shell incoming events with the authoritative profile Board. */
import {
	isEngineError,
	type EngineHost,
	type IncomingCallShellEvent,
	type PlayerProfile,
} from "@airpc/rpg-engine";
import { writeStudioLog } from "@studio-v2/src/utils/server/observability/logger/pinoLogger.server";

function hasAnswerableInstance(
	profile: PlayerProfile,
	event: IncomingCallShellEvent,
): boolean {
	const item = profile.callCards.board.byAgent[event.agentId]?.pending.find(
		(row) => row.instanceId === event.instanceId,
	);
	return item?.status === "pending" || item?.status === "missed";
}

export function dismissStaleIncomingEvent(
	host: EngineHost,
	userId: string,
	event: IncomingCallShellEvent,
	reason: string,
): void {
	const dismissed = host.dismissIncomingCallEvent(
		userId,
		event.eventId,
		"dismissed",
	);
	writeStudioLog("debugger", "warn", {
		event: isEngineError(dismissed)
			? "debugger.incoming.stale_dismiss_failed"
			: "debugger.incoming.stale_dismissed",
		userId,
		message: isEngineError(dismissed)
			? dismissed.message
			: "dismissed incoming event without an answerable Board instance",
		payload: {
			eventId: event.eventId,
			instanceId: event.instanceId,
			agentId: event.agentId,
			reason,
		},
	});
}

export function pruneUnanswerableIncomingEvents(
	host: EngineHost,
	userId: string,
	profile: PlayerProfile,
	events: readonly IncomingCallShellEvent[],
): IncomingCallShellEvent[] {
	return events.filter(function (event) {
		if (hasAnswerableInstance(profile, event)) return true;
		dismissStaleIncomingEvent(
			host,
			userId,
			event,
			"board_pending_missing_or_not_answerable",
		);
		return false;
	});
}
