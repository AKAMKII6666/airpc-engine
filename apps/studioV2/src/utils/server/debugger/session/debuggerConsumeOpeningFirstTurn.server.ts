import { isEngineError, type CallSession, type EngineHost } from "@airpc/rpg-engine";
import type { EngineError } from "@airpc/rpg-engine";
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/debugger/llm/llmClient.server";

type OpeningFirstTurnAction =
	| "emit_assistant_turn"
	| "request_llm_opening"
	| "already_emitted"
	| "skipped";

type ConsumeOpeningFirstTurnResult = {
	ok: true;
	action: OpeningFirstTurnAction;
	text?: string;
	session: CallSession;
	source: "opening_first_turn_gate";
};

type EngineHostWithOpeningFirstTurn = EngineHost & {
	consumeOpeningFirstTurn(sessionId: string): ConsumeOpeningFirstTurnResult | EngineError;
};

export type DebuggerConsumedOpeningFirstTurn =
	| {
			mode: "direct";
			session: CallSession;
			llm: ServerLlmChatResult;
			toolEvents: [];
	  }
	| {
			mode: "llm";
			session: CallSession;
	  }
	| {
			mode: "skipped";
			session: CallSession;
			llm: null;
			toolEvents: [];
	  };

function directOpeningLlmResult(text: string): ServerLlmChatResult {
	return {
		text,
		toolCalls: [],
		finishReason: "direct_opening",
		responseId: null,
		model: "opening-first-turn-gate",
	};
}

export function consumeDebuggerOpeningFirstTurn(
	host: EngineHost,
	session: CallSession,
): DebuggerConsumedOpeningFirstTurn {
	const consumed = (host as EngineHostWithOpeningFirstTurn)
		.consumeOpeningFirstTurn(session.sessionId);
	if (isEngineError(consumed)) throw consumed;
	if (consumed.action === "request_llm_opening") {
		return { mode: "llm", session: consumed.session };
	}
	if (consumed.action === "emit_assistant_turn") {
		return {
			mode: "direct",
			session: consumed.session,
			llm: directOpeningLlmResult(consumed.text ?? ""),
			toolEvents: [],
		};
	}
	return {
		mode: "skipped",
		session: consumed.session,
		llm: null,
		toolEvents: [],
	};
}
