/**
 * endCall + PostCallJob 创建/收尾：从 createEngineHost 拆出，Host 装配只转调。
 * Free / Story 分函数，避免单函数超硬上限。
 */
import { randomUUID } from "node:crypto";
import { engineError, type EngineError } from "./errors.js";
import type {
	CallSession,
	EndCallResult,
	FreePipelineTrace,
	LogRecord,
	PostCallJob,
	SaveReason,
} from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { Effect, Outcome } from "../schema/outcome.js";
import { OutcomeSchema } from "../schema/outcome.js";
import { getChapterConf, type WorkspaceState } from "../workspace/loadWorkspace.js";
import { selectExit } from "../runtime/exitSelector.js";
import { executeEffects } from "../runtime/effectExecutor.js";
import {
	commitStoryCallMemory,
	type StoryCallMemoryCommitResult,
} from "../runtime/storyCallMemoryCommit.js";
import { sessionIsFreeLike } from "./callNarrativeGate.js";
import type { MemoryPort } from "../memory/types.js";
import { isMediaEffect, type EffectSink } from "../runtime/effectSink.js";
import { markVoicemailListenedAfterEndCall } from "../runtime/voicemail/markVoicemailListened.js";
import { persistConversationInertiaToProfile } from "./conversationInertiaStore.js";
import { buildBackgroundSteps, postCallJobSummary } from "./postCallJobRuntime.js";
import type { PostCallJobStorePort } from "../ports/postCallJobStorePort.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import type { OnVoicemailUnreadChanged } from "../runtime/voicemail/voicemailPorts.js";
import type { AfterHangupHook } from "../capabilityPacks/contributeTypes.js";
import { runAfterHangupHooks } from "../capabilityPacks/runAfterHangupHooks.js";

const ACTIVE_STATUSES = new Set<CallSession["status"]>([
	"resolving",
	"composing",
	"in_call",
	"evaluating",
	"selecting_exit",
	"executing_effects",
]);

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

export interface EndCallHandlerDeps {
	sessions: Map<string, CallSession>;
	profiles: Map<string, PlayerProfile>;
	activeByUser: Map<string, string>;
	postCallJobs: Map<string, PostCallJob>;
	postCallJobStore: PostCallJobStorePort | null;
	getMemory: () => MemoryPort | null;
	effectSink: EffectSink;
	lookupCard: ScheduledCardLookup;
	requireWorkspace: () => WorkspaceState;
	enqueueProfileWrite: <T>(userId: string, fn: () => Promise<T>) => Promise<T>;
	saveProfile: (userId: string, reason: SaveReason) => Promise<void>;
	pushLog: (record: LogRecord) => void;
	onVoicemailUnreadChanged: OnVoicemailUnreadChanged | null;
	preloadExitCandidateScheduleTargets: (session: CallSession) => Promise<void>;
	preloadScheduleCallCardTargets: (
		effects: readonly Record<string, unknown>[],
	) => Promise<void>;
	mirrorPostCallJob: (job: PostCallJob) => Promise<void>;
	setPostCallJob: (
		jobId: string,
		patch: Partial<PostCallJob>,
	) => Promise<PostCallJob | null>;
	startPostCallBackgroundJob: (jobId: string) => void;
	runPostCallBackgroundJob: (jobId: string) => Promise<void>;
	/** L1 call.afterHangup：endCall outcome 后、Free/Story 分支前；缺省空 */
	afterHangupHooks?: readonly AfterHangupHook[];
	packIdByHookId?: ReadonlyMap<string, string>;
}

interface EndCallContext {
	sessionId: string;
	endSession: CallSession;
	endProfile: PlayerProfile;
	outcome: Outcome;
	nowIso: string;
}

type SelectedExit = NonNullable<ReturnType<typeof selectExit>>;

function applyVoicemailListenedSideEffect(
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

async function finalizeEndedCall(
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

function buildClosingJob(input: {
	jobId: string;
	ctx: EndCallContext;
	selectedExitId?: string;
	exitSource?: PostCallJob["exitSource"];
	exitPriority?: number;
	mediaEffects: Effect[];
	memoryPolicy: PostCallJob["memoryPolicy"];
}): PostCallJob {
	const { ctx } = input;
	return {
		schemaVersion: 1,
		jobId: input.jobId,
		sessionId: ctx.endSession.sessionId,
		userId: ctx.endSession.userId,
		primaryAgentId: ctx.endSession.resolve.agentId,
		source: ctx.endSession.resolve.source,
		cardId: ctx.endSession.resolve.cardId,
		chapterId: ctx.endSession.chapterId,
		selectedExitId: input.selectedExitId,
		exitSource: input.exitSource,
		exitPriority: input.exitPriority,
		outcomeFlags: ctx.outcome.flags,
		generation: 1,
		attempt: 1,
		status: "closing",
		updatedAt: ctx.nowIso,
		commitCursor: [],
		failedSteps: [],
		steps: buildBackgroundSteps(input.mediaEffects.length),
		effectPlanResult: { results: [], aborted: false, status: "completed" },
		memoryPolicy: input.memoryPolicy,
		deferredEffects: input.mediaEffects,
		voicemailPending: true,
		sessionSnapshot: ctx.endSession,
		syncCommitted: false,
	};
}

async function registerClosingJob(
	deps: EndCallHandlerDeps,
	job: PostCallJob,
): Promise<string> {
	deps.postCallJobs.set(job.jobId, job);
	await deps.mirrorPostCallJob(job);
	return job.jobId;
}

async function kickBackgroundOrInline(
	deps: EndCallHandlerDeps,
	jobId: string,
): Promise<void> {
	await deps.setPostCallJob(jobId, { status: "background_pending" });
	if (deps.postCallJobStore) {
		deps.startPostCallBackgroundJob(jobId);
	} else {
		await deps.runPostCallBackgroundJob(jobId);
	}
}

function applySessionStatusFromPlan(session: CallSession, planStatus: string): void {
	session.status =
		planStatus === "aborted"
			? "aborted"
			: planStatus === "completed_with_errors"
				? "completed_with_errors"
				: "completed";
}

function splitEffects(effects: Effect[]): { sync: Effect[]; media: Effect[] } {
	return {
		sync: effects.filter(function (effect) {
			return !isMediaEffect(effect);
		}),
		media: effects.filter(function (effect) {
			return isMediaEffect(effect);
		}),
	};
}

function applyFreeSelectedExit(
	session: CallSession,
	selected: SelectedExit | null,
): void {
	if (selected) {
		session.selectedExit = {
			exitId: selected.exit.exitId,
			source: selected.source,
			priority: selected.priority,
			reason: [
				"free_pipeline",
				`source=${selected.source}`,
				`exitId=${selected.exit.exitId}`,
				`priority=${selected.priority}`,
			].join("; "),
		};
		return;
	}
	session.selectedExit = {
		source: "dynamic",
		priority: 0,
		reason: "free:skipped_exit(no_candidates)",
	};
}

function buildFreePipelineTrace(input: {
	skippedExit: boolean;
	selected: SelectedExit | null;
	planStatus: string;
}): FreePipelineTrace {
	return {
		committed: false,
		skippedExit: input.skippedExit,
		selectedExitId: input.selected?.exit.exitId,
		steps: [
			{
				id: "gate",
				status: "done",
				detail: "manual minTurns=0 or candidates/answered",
			},
			{ id: "memory_commit", status: "pending", detail: "background" },
			{
				id: "exit_select",
				status: input.skippedExit ? "skipped" : input.selected ? "done" : "failed",
				detail: input.selected?.exit.exitId,
			},
			{
				id: "effect_plan",
				status: input.planStatus === "aborted" ? "failed" : "done",
				detail: input.planStatus,
			},
		],
	};
}

async function commitOrFailSyncPlan(input: {
	deps: EndCallHandlerDeps;
	ctx: EndCallContext;
	jobId: string;
	plan: EndCallResult["effectPlanResult"];
	syncEffects: Effect[];
	freePipeline?: FreePipelineTrace;
	selectedExitId?: string;
}): Promise<EndCallResult> {
	const { deps, ctx, jobId, plan, syncEffects } = input;
	const commitCursor = syncEffects.map(function (effect) {
		return effect.id;
	});
	if (plan.status === "aborted") {
		await deps.setPostCallJob(jobId, {
			status: "failed_retryable",
			syncCommitted: false,
			effectPlanResult: plan,
			...(input.freePipeline ? { freePipeline: input.freePipeline } : {}),
			commitCursor,
			sessionSnapshot: ctx.endSession,
			failedSteps: [
				{ stepId: "sync_effects", error: `sync plan status=${plan.status}` },
			],
		});
		return {
			ok: true,
			session: ctx.endSession,
			selectedExitId: input.selectedExitId,
			effectPlanResult: plan,
			...(input.freePipeline ? { freePipeline: input.freePipeline } : {}),
			postCallJobId: jobId,
			postCallJob: postCallJobSummary(deps.postCallJobs.get(jobId)!),
		};
	}
	await deps.setPostCallJob(jobId, {
		status: "committed",
		syncCommitted: true,
		effectPlanResult: plan,
		...(input.freePipeline ? { freePipeline: input.freePipeline } : {}),
		commitCursor,
		sessionSnapshot: ctx.endSession,
	});
	await kickBackgroundOrInline(deps, jobId);
	const finalJob = deps.postCallJobs.get(jobId)!;
	return {
		ok: true,
		session: ctx.endSession,
		selectedExitId: input.selectedExitId,
		effectPlanResult: finalJob.effectPlanResult,
		...(input.freePipeline
			? { freePipeline: finalJob.freePipeline ?? input.freePipeline }
			: { storyMemoryCommit: finalJob.storyMemoryCommit }),
		postCallJobId: jobId,
		postCallJob: postCallJobSummary(finalJob),
	};
}

/** Free 挂机：出口可选 → 同步 Effect → PostCallJob 后台。 */
async function endFreeCallWithPostCallJob(
	deps: EndCallHandlerDeps,
	ctx: EndCallContext,
): Promise<EndCallResult> {
	const { endSession, endProfile, outcome, nowIso } = ctx;
	endSession.status = "selecting_exit";
	await deps.preloadExitCandidateScheduleTargets(endSession);
	const selected =
		endSession.exitCandidates.length > 0
			? selectExit(endSession.frozenCard, outcome, endSession.exitCandidates)
			: null;
	const skippedExit = !selected;
	applyFreeSelectedExit(endSession, selected);
	const { sync: syncEffects, media: mediaEffects } = splitEffects(
		selected ? selected.exit.effects : [],
	);
	const jobId = await registerClosingJob(
		deps,
		buildClosingJob({
			jobId: randomUUID(),
			ctx,
			selectedExitId: selected?.exit.exitId,
			exitSource: selected?.source,
			exitPriority: selected?.priority,
			mediaEffects,
			memoryPolicy: "free",
		}),
	);
	const plan = await deps.enqueueProfileWrite(endSession.userId, async function () {
		const p = await executeEffects(syncEffects, {
			profile: endProfile,
			session: endSession,
			nowIso,
			memory: deps.getMemory(),
			effectSink: deps.effectSink,
			lookupCard: deps.lookupCard,
		});
		endSession.effectPlanResult = p;
		applyVoicemailListenedSideEffect(deps, ctx);
		await finalizeEndedCall(deps, ctx, {
			saveReason: "after_free_pipeline",
			logType: "call.completed",
			logPayload: {
				free: true,
				exitId: selected?.exit.exitId,
				skippedExit,
				effectResults: p.results,
				planStatus: p.status,
			},
		});
		return p;
	});
	endSession.effectPlanResult = plan;
	applySessionStatusFromPlan(endSession, plan.status);
	return commitOrFailSyncPlan({
		deps,
		ctx,
		jobId,
		plan,
		syncEffects,
		freePipeline: buildFreePipelineTrace({ skippedExit, selected, planStatus: plan.status }),
		selectedExitId: selected?.exit.exitId,
	});
}

async function abortStoryNoExit(
	deps: EndCallHandlerDeps,
	ctx: EndCallContext,
): Promise<EngineError> {
	const storyMemoryCommit = await commitStoryCallMemory({
		session: ctx.endSession,
		outcome: ctx.outcome,
		memory: deps.getMemory(),
		nowIso: ctx.nowIso,
		planStatus: "aborted",
	}).catch(function (err): StoryCallMemoryCommitResult {
		return {
			committed: false,
			skippedReason: "commit_failed",
			error: errorMessage(err),
		};
	});
	applyVoicemailListenedSideEffect(deps, ctx);
	ctx.endSession.status = "aborted";
	ctx.endSession.effectPlanResult = {
		results: [],
		aborted: true,
		status: "aborted",
	};
	await finalizeEndedCall(deps, ctx, {
		saveReason: "after_effect",
		logType: "call.no_exit",
		logPayload: {
			memoryCommitted: storyMemoryCommit.committed,
			memorySkippedReason: storyMemoryCommit.skippedReason,
			memoryError: storyMemoryCommit.error,
		},
	});
	return engineError("NO_EXIT_MATCHED", "no exit matched outcome");
}

function applyStorySelectedExit(session: CallSession, selected: SelectedExit): void {
	session.selectedExit = {
		exitId: selected.exit.exitId,
		source: selected.source,
		priority: selected.priority,
		reason: [
			`source=${selected.source}`,
			`exitId=${selected.exit.exitId}`,
			`priority=${selected.priority}`,
			selected.candidateId ? `candidate=${selected.candidateId}` : null,
		]
			.filter(Boolean)
			.join("; "),
	};
}

/** Story 挂机：必须命中出口 → 同步 Effect → PostCallJob 后台。 */
async function endStoryCallWithPostCallJob(
	deps: EndCallHandlerDeps,
	ctx: EndCallContext,
): Promise<EndCallResult | EngineError> {
	const { endSession, endProfile, outcome, nowIso } = ctx;
	endSession.status = "selecting_exit";
	const selected = selectExit(
		endSession.frozenCard,
		outcome,
		endSession.exitCandidates,
	);
	if (!selected) {
		return abortStoryNoExit(deps, ctx);
	}
	applyStorySelectedExit(endSession, selected);
	endSession.status = "executing_effects";
	await deps.preloadScheduleCallCardTargets(selected.exit.effects);
	const { sync: syncEffects, media: mediaEffects } = splitEffects(selected.exit.effects);
	const jobId = await registerClosingJob(
		deps,
		buildClosingJob({
			jobId: randomUUID(),
			ctx,
			selectedExitId: selected.exit.exitId,
			exitSource: selected.source,
			exitPriority: selected.priority,
			mediaEffects,
			memoryPolicy: "story",
		}),
	);
	const plan = await deps.enqueueProfileWrite(endSession.userId, async function () {
		const p = await executeEffects(syncEffects, {
			profile: endProfile,
			session: endSession,
			nowIso,
			memory: deps.getMemory(),
			effectSink: deps.effectSink,
			lookupCard: deps.lookupCard,
			getChapterConf(chapterId) {
				return getChapterConf(deps.requireWorkspace(), chapterId);
			},
		});
		endSession.effectPlanResult = p;
		applyVoicemailListenedSideEffect(deps, ctx);
		await finalizeEndedCall(deps, ctx, {
			saveReason: "after_effect",
			logType: "call.completed",
			logPayload: {
				exitId: selected.exit.exitId,
				effectResults: p.results,
				planStatus: p.status,
			},
		});
		return p;
	});
	endSession.effectPlanResult = plan;
	applySessionStatusFromPlan(endSession, plan.status);
	return commitOrFailSyncPlan({
		deps,
		ctx,
		jobId,
		plan,
		syncEffects,
		selectedExitId: selected.exit.exitId,
	});
}

/** 装配 endCall：校验会话后按 Free/Story 分支转调。 */
export function createEndCallHandler(deps: EndCallHandlerDeps) {
	return async function endCall(
		sessionId: string,
		outcomeInput: Outcome,
	): Promise<EndCallResult | EngineError> {
		const session = deps.sessions.get(sessionId);
		if (!session) {
			return engineError("NOT_FOUND", `session not found: ${sessionId}`);
		}
		if (!ACTIVE_STATUSES.has(session.status)) {
			return engineError(
				"ENGINE_INTERNAL",
				`session not endable: ${session.status}`,
			);
		}

		const outcome = OutcomeSchema.parse(outcomeInput);
		session.status = "evaluating";
		session.outcome = outcome;
		session.phoneFlags = { ...session.phoneFlags, ...outcome.flags };
		session.completedBeats = [...outcome.completedBeats];
		outcome.flags = { ...session.phoneFlags };

		const profile = deps.profiles.get(session.userId);
		if (!profile) {
			return engineError("NOT_FOUND", "profile missing for endCall");
		}
		const ctx: EndCallContext = {
			sessionId,
			endSession: session,
			endProfile: profile,
			outcome,
			nowIso: new Date().toISOString(),
		};

		const afterHangupEvents = await runAfterHangupHooks({
			hooks: deps.afterHangupHooks ?? [],
			userId: session.userId,
			sessionId,
			agentId: session.resolve.agentId,
			profile,
			packIdByHookId: deps.packIdByHookId,
		});
		for (const event of afterHangupEvents) {
			deps.pushLog({
				at: ctx.nowIso,
				type: event.type,
				userId: session.userId,
				payload: event,
			});
		}

		const isFree = sessionIsFreeLike({
			chapterId: session.chapterId,
			cardKind: session.frozenCard.cardKind,
			source: session.resolve.source,
		});
		if (isFree) {
			return endFreeCallWithPostCallJob(deps, ctx);
		}
		return endStoryCallWithPostCallJob(deps, ctx);
	};
}
