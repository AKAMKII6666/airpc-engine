/**
 * Free/Story 挂机分支：从 endCallWithPostCallJob 拆出，使 Host 装配文件停在行数告警线以下。
 */
import { randomUUID } from "node:crypto";
import { engineError, type EngineError } from "../errors.js";
import type {
	CallSession,
	EndCallResult,
	FreePipelineTrace,
	PostCallJob,
} from "../types.js";
import type { Effect } from "../../schema/call/outcome.js";
import { selectExit } from "../../runtime/exit/exitSelector.js";
import {
	commitStoryCallMemory,
	type StoryCallMemoryCommitResult,
} from "../../runtime/memory/storyCallMemoryCommit.js";
import { isMediaEffect } from "../../runtime/effect/effectSink.js";
import { buildBackgroundSteps, postCallJobSummary } from "../postCallJob/runtime/postCallJobRuntime.js";
import type { EndCallHandlerDeps } from "./endCallWithPostCallJob.js";
import {
	applyVoicemailListenedSideEffect,
	executeFreeSyncPlan,
	executeStorySyncPlan,
	finalizeEndedCall,
	type EndCallContext,
} from "./endCallSyncPlans.js";

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

type SelectedExit = NonNullable<ReturnType<typeof selectExit>>;

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
export async function endFreeCallWithPostCallJob(
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
	const plan = await deps.enqueueProfileWrite(endSession.userId, function () {
		return executeFreeSyncPlan({
			deps,
			ctx,
			syncEffects,
			endProfile,
			endSession,
			nowIso,
			exitId: selected?.exit.exitId,
			skippedExit,
		});
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
export async function endStoryCallWithPostCallJob(
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
	await deps.preloadScheduleCallCardTargets(
		selected.exit.effects,
		endSession.chapterId,
	);
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
	const plan = await deps.enqueueProfileWrite(endSession.userId, function () {
		return executeStorySyncPlan({
			deps,
			ctx,
			syncEffects,
			endProfile,
			endSession,
			nowIso,
			exitId: selected.exit.exitId,
		});
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
