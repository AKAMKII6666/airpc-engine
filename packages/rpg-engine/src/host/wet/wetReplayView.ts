/**
 * WET 重放视图装配；从 wet.buildWetReplayView 抽出以降行数与圈复杂度。
 * 类型定义留在本文件，由 wet.ts re-export，避免循环 import。
 */
import type { CallSession, EffectPlanResult, LogRecord } from "../types.js";

export const WET_STORAGE_NOTE =
	"WET 真源 = Host 内存 ring + data/logs/engine-YYYYMMDD.jsonl（旁路）。" +
	"不整份写入 Profile／SaveGame；幂等权威在 CallSession.effectLedger（通话内）。" +
	"受控追加仅 wet.annotation／wet.compensation，禁止改写既有行。";

export interface WetReplayView {
	sessionId: string;
	storageNote: string;
	/** 该 session 相关事件（时间升序） */
	events: LogRecord[];
	session: {
		status: CallSession["status"];
		userId: string;
		packageId: string;
		cardId: string;
		agentId: string;
		startedAt: string;
		endedAt?: string;
		selectedExit?: CallSession["selectedExit"];
		effectPlanResult?: EffectPlanResult;
		effectLedgerKeys: string[];
	} | null;
	/** 从事件／session 抽出的观测摘要 */
	summary: {
		exitId?: string;
		planStatus?: string;
		effectCount: number;
		annotationCount: number;
		compensationCount: number;
	};
}

interface WetReplaySummaryAcc {
	exitId?: string;
	planStatus?: string;
	effectCount: number;
	annotationCount: number;
	compensationCount: number;
}

function accumulateWetEventSummary(events: LogRecord[]): WetReplaySummaryAcc {
	const acc: WetReplaySummaryAcc = {
		effectCount: 0,
		annotationCount: 0,
		compensationCount: 0,
	};
	for (const ev of events) {
		if (ev.type === "wet.annotation") acc.annotationCount += 1;
		if (ev.type === "wet.compensation") acc.compensationCount += 1;
		const payload = ev.payload as Record<string, unknown> | undefined;
		if (payload && typeof payload.exitId === "string") {
			acc.exitId = payload.exitId;
		}
		if (payload && typeof payload.planStatus === "string") {
			acc.planStatus = payload.planStatus;
		}
		if (Array.isArray(payload?.effectResults)) {
			acc.effectCount = payload.effectResults.length;
		}
	}
	return acc;
}

function applySessionOverrides(
	acc: WetReplaySummaryAcc,
	session: CallSession | null,
): WetReplaySummaryAcc {
	if (session?.selectedExit?.exitId) {
		acc.exitId = session.selectedExit.exitId;
	}
	if (session?.effectPlanResult) {
		acc.planStatus = session.effectPlanResult.status;
		acc.effectCount = session.effectPlanResult.results.length;
	}
	return acc;
}

function projectWetSessionSlice(
	session: CallSession,
): NonNullable<WetReplayView["session"]> {
	return {
		status: session.status,
		userId: session.userId,
		packageId: session.chapterId,
		cardId: session.resolve.cardId,
		agentId: session.resolve.agentId,
		startedAt: session.startedAt,
		endedAt: session.endedAt,
		selectedExit: session.selectedExit,
		effectPlanResult: session.effectPlanResult,
		effectLedgerKeys: Object.keys(session.effectLedger),
	};
}

/** 过滤排序事件并拼装 WetReplayView。 */
export function assembleWetReplayView(opts: {
	sessionId: string;
	events: LogRecord[];
	session: CallSession | null;
}): WetReplayView {
	const events = opts.events
		.filter(function (r) {
			return r.sessionId === opts.sessionId;
		})
		.sort(function (a, b) {
			return a.at.localeCompare(b.at);
		});
	const summary = applySessionOverrides(
		accumulateWetEventSummary(events),
		opts.session,
	);
	return {
		sessionId: opts.sessionId,
		storageNote: WET_STORAGE_NOTE,
		events,
		session: opts.session ? projectWetSessionSlice(opts.session) : null,
		summary: {
			exitId: summary.exitId,
			planStatus: summary.planStatus,
			effectCount: summary.effectCount,
			annotationCount: summary.annotationCount,
			compensationCount: summary.compensationCount,
		},
	};
}
