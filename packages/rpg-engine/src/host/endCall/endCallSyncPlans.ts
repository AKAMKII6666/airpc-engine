/**
 * endCall 同步 Effect 计划：从 endCallWithPostCallJob 拆出，避免单文件顶到硬上限。
 * 只负责写会话结果并落盘；出口选择与 PostCallJob 登记仍留在调用方。
 */
import type { CallSession, LogRecord, SaveReason } from "../types.js";
import type { PlayerProfile } from "../../schema/identity/profile.js";
import type { Effect, Outcome } from "../../schema/call/outcome.js";
import { getChapterConf } from "../../workspace/loadWorkspace.js";
import { executeEffects } from "../../runtime/effect/effectExecutor.js";
import { persistConversationInertiaToProfile } from "../beginCall/inertia/conversationInertiaStore.js";
import { markVoicemailListenedAfterEndCall } from "../../runtime/voicemail/mailbox/markVoicemailListened.js";
import type { EndCallHandlerDeps } from "./endCallWithPostCallJob.js";

export interface EndCallContext {
	sessionId: string;
	endSession: CallSession;
	endProfile: PlayerProfile;
	outcome: Outcome;
	nowIso: string;
}

export function applyVoicemailListenedSideEffect(
	deps: EndCallHandlerDeps,
	ctx: EndCallContext,
): void {
	markVoicemailListenedAfterEndCall({
		session: ctx.endSession,
		profile: ctx.endProfile,
		outcome: ctx.outcome,
		nowIso: ctx.nowIso,
		onVoicemailUnreadChanged: deps.onVoicemailUnreadChanged,
	});
}

export async function finalizeEndedCall(
	deps: EndCallHandlerDeps,
	ctx: EndCallContext,
	input: {
		saveReason: SaveReason;
		logType?: string;
		logPayload?: unknown;
	},
): Promise<void> {
	ctx.endSession.endedAt = ctx.nowIso;
	ctx.endSession.interactionPhase = "done";
	persistConversationInertiaToProfile({
		profile: ctx.endProfile,
		session: ctx.endSession,
	});
	await deps.saveProfile(ctx.endSession.userId, input.saveReason);
	deps.activeByUser.delete(ctx.endSession.userId);
	if (input.logType) {
		deps.pushLog({
			at: ctx.nowIso,
			type: input.logType,
			userId: ctx.endSession.userId,
			sessionId: ctx.sessionId,
			payload: input.logPayload,
		});
	}
}

/** Free 同步 Effect：写会话结果并落盘，供 enqueueProfileWrite 串行。 */
export async function executeFreeSyncPlan(input: {
	deps: EndCallHandlerDeps;
	ctx: EndCallContext;
	syncEffects: Effect[];
	endProfile: PlayerProfile;
	endSession: CallSession;
	nowIso: string;
	exitId: string | undefined;
	skippedExit: boolean;
}) {
	const p = await executeEffects(input.syncEffects, {
		profile: input.endProfile,
		session: input.endSession,
		nowIso: input.nowIso,
		memory: input.deps.getMemory(),
		effectSink: input.deps.effectSink,
		lookupCard: input.deps.lookupCard,
	});
	input.endSession.effectPlanResult = p;
	applyVoicemailListenedSideEffect(input.deps, input.ctx);
	await finalizeEndedCall(input.deps, input.ctx, {
		saveReason: "after_free_pipeline",
		logType: "call.completed",
		logPayload: {
			free: true,
			exitId: input.exitId,
			skippedExit: input.skippedExit,
			effectResults: p.results,
			planStatus: p.status,
		},
	});
	return p;
}

/** Story 同步 Effect：带章节配置查找，供 enqueueProfileWrite 串行。 */
export async function executeStorySyncPlan(input: {
	deps: EndCallHandlerDeps;
	ctx: EndCallContext;
	syncEffects: Effect[];
	endProfile: PlayerProfile;
	endSession: CallSession;
	nowIso: string;
	exitId: string;
}) {
	const p = await executeEffects(input.syncEffects, {
		profile: input.endProfile,
		session: input.endSession,
		nowIso: input.nowIso,
		memory: input.deps.getMemory(),
		effectSink: input.deps.effectSink,
		lookupCard: input.deps.lookupCard,
		getChapterConf(chapterId) {
			return getChapterConf(input.deps.requireWorkspace(), chapterId);
		},
	});
	input.endSession.effectPlanResult = p;
	applyVoicemailListenedSideEffect(input.deps, input.ctx);
	await finalizeEndedCall(input.deps, input.ctx, {
		saveReason: "after_effect",
		logType: "call.completed",
		logPayload: {
			exitId: input.exitId,
			effectResults: p.results,
			planStatus: p.status,
		},
	});
	return p;
}
