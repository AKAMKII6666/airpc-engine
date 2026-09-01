/**
 * PostCallJob 后台阶段实现：memory → rollup → media → voicemail。
 * 从 postCallJobRuntime 拆出，使工厂只做装配，阶段函数各自控复杂度。
 */
import type { CallSession, EndCallResult, PostCallJob } from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";
import { executeEffects } from "../runtime/effectExecutor.js";
import { runFreeCallMemoryCommit } from "../runtime/freeCallPostPipeline.js";
import {
	commitStoryCallMemory,
	type StoryCallMemoryCommitResult,
} from "../runtime/storyCallMemoryCommit.js";
import { materializeVoicemailsAfterPlan } from "./materializeVoicemailsAfterPlan.js";
import type { PostCallJobRuntimeDeps } from "./postCallJobRuntime.js";

export interface PostCallJobPhaseHelpers {
	setPostCallJob: (
		jobId: string,
		patch: Partial<PostCallJob>,
	) => Promise<PostCallJob | null>;
	patchJobSteps: (
		jobId: string,
		stepId: PostCallJob["steps"][number]["id"],
		status: PostCallJob["steps"][number]["status"],
		detail?: string,
	) => PostCallJob["steps"];
	stepIsFinished: (
		job: PostCallJob,
		stepId: PostCallJob["steps"][number]["id"],
	) => boolean;
}

function derivePostCallEffectStatus(
	results: EndCallResult["effectPlanResult"]["results"],
	aborted: boolean,
): "completed" | "completed_with_errors" | "aborted" {
	if (aborted) return "aborted";
	if (
		results.some(function (r) {
			return r.status === "failed";
		})
	) {
		return "completed_with_errors";
	}
	return "completed";
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** Free / Story 记忆提交阶段；失败写 failed_retryable。 */
export async function runMemoryPhase(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	job: PostCallJob,
	session: CallSession,
	nowIso: string,
): Promise<boolean> {
	if (job.memoryPolicy === "none" || helpers.stepIsFinished(job, "memory_commit")) {
		return true;
	}
	await helpers.setPostCallJob(jobId, {
		status: "memory_committing",
		steps: helpers.patchJobSteps(jobId, "memory_commit", "running"),
	});
	if (job.memoryPolicy === "free") {
		return runFreeMemoryCommit(deps, helpers, jobId, job, session, nowIso);
	}
	return runStoryMemoryCommit(deps, helpers, jobId, job, session, nowIso);
}

async function runFreeMemoryCommit(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	job: PostCallJob,
	session: CallSession,
	nowIso: string,
): Promise<boolean> {
	try {
		const commit = await runFreeCallMemoryCommit({
			session,
			outcome: session.outcome ?? {
				flags: job.outcomeFlags,
				completedBeats: [],
				missedRequiredBeats: [],
			},
			memory: deps.getMemory(),
			nowIso,
			minTurns: session.channel === "manual" ? 0 : 2,
		});
		await helpers.setPostCallJob(jobId, {
			steps: helpers.patchJobSteps(
				jobId,
				"memory_commit",
				commit.committed ? "done" : "skipped",
				commit.commitEntryIds?.join(",") ?? commit.skippedReason,
			),
			freePipeline: {
				...(deps.postCallJobs.get(jobId)?.freePipeline ??
					job.freePipeline ?? {
						committed: false,
						skippedExit: true,
						steps: [],
					}),
				committed: commit.committed,
				commitEntryIds: commit.commitEntryIds,
			},
		});
		return true;
	} catch (err) {
		await helpers.setPostCallJob(jobId, {
			status: "failed_retryable",
			steps: helpers.patchJobSteps(jobId, "memory_commit", "failed", errorMessage(err)),
			failedSteps: [
				...(deps.postCallJobs.get(jobId)?.failedSteps ?? []),
				{ stepId: "memory_commit", error: errorMessage(err) },
			],
		});
		return false;
	}
}

async function runStoryMemoryCommit(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	job: PostCallJob,
	session: CallSession,
	nowIso: string,
): Promise<boolean> {
	const commit = await commitStoryCallMemory({
		session,
		outcome: session.outcome ?? {
			flags: job.outcomeFlags,
			completedBeats: [],
			missedRequiredBeats: [],
		},
		memory: deps.getMemory(),
		nowIso,
		selectedExitId: job.selectedExitId,
		planStatus: job.effectPlanResult.status,
	}).catch(function (err): StoryCallMemoryCommitResult {
		return {
			committed: false,
			skippedReason: "commit_failed",
			error: errorMessage(err),
		};
	});
	if (commit.skippedReason === "commit_failed") {
		await helpers.setPostCallJob(jobId, {
			status: "failed_retryable",
			steps: helpers.patchJobSteps(jobId, "memory_commit", "failed", commit.error),
			storyMemoryCommit: {
				committed: false,
				skippedReason: commit.skippedReason,
				error: commit.error,
			},
			failedSteps: [
				...(deps.postCallJobs.get(jobId)?.failedSteps ?? []),
				{ stepId: "memory_commit", error: commit.error ?? "commit_failed" },
			],
		});
		return false;
	}
	await helpers.setPostCallJob(jobId, {
		steps: helpers.patchJobSteps(
			jobId,
			"memory_commit",
			commit.committed ? "done" : "skipped",
			commit.commitEntryIds?.join(",") ?? commit.skippedReason,
		),
		storyMemoryCommit: {
			committed: commit.committed,
			commitEntryIds: commit.commitEntryIds,
			skippedReason: commit.skippedReason,
			error: commit.error,
		},
	});
	return true;
}

/** 可选 Memory.rollupIfNeeded；无实现则 skip。 */
export async function runRollupPhase(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	job: PostCallJob,
	nowIso: string,
): Promise<boolean> {
	const afterMemory = deps.postCallJobs.get(jobId) ?? job;
	if (helpers.stepIsFinished(afterMemory, "rollup")) return true;
	await helpers.setPostCallJob(jobId, {
		status: "rollup_running",
		steps: helpers.patchJobSteps(jobId, "rollup", "running"),
	});
	if (!deps.getMemory()?.rollupIfNeeded) {
		await helpers.setPostCallJob(jobId, {
			steps: helpers.patchJobSteps(jobId, "rollup", "skipped", "no_rollup"),
		});
		return true;
	}
	try {
		await deps.getMemory()!.rollupIfNeeded!({
			userId: job.userId,
			agentId: job.primaryAgentId,
			endedAt: nowIso,
		});
		await helpers.setPostCallJob(jobId, {
			steps: helpers.patchJobSteps(jobId, "rollup", "done"),
		});
		return true;
	} catch (err) {
		await helpers.setPostCallJob(jobId, {
			status: "failed_retryable",
			steps: helpers.patchJobSteps(jobId, "rollup", "failed", errorMessage(err)),
			failedSteps: [
				...(deps.postCallJobs.get(jobId)?.failedSteps ?? []),
				{ stepId: "rollup", error: errorMessage(err) },
			],
		});
		return false;
	}
}

/** 延迟媒体 Effect；写入 effectPlanResult 并可能 failed_retryable。 */
async function executeDeferredMediaEffects(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	liveJob: PostCallJob,
	session: CallSession,
	profile: PlayerProfile,
	nowIso: string,
): Promise<void> {
	const mediaPlan = await executeEffects(liveJob.deferredEffects!, {
		profile,
		session,
		nowIso,
		memory: deps.getMemory(),
		effectSink: deps.effectSink,
		lookupCard: deps.lookupCard,
	});
	const mergedResults = [
		...(liveJob.effectPlanResult.results ?? []),
		...mediaPlan.results,
	];
	const aborted = liveJob.effectPlanResult.aborted || mediaPlan.aborted;
	session.effectPlanResult = {
		results: mergedResults,
		aborted,
		status: derivePostCallEffectStatus(mergedResults, aborted),
	};
	await deps.saveProfile(liveJob.userId, "after_effect");
	const mediaOk = mediaPlan.status === "completed";
	const priorFailed = deps.postCallJobs.get(jobId)?.failedSteps ?? [];
	await helpers.setPostCallJob(jobId, {
		effectPlanResult: session.effectPlanResult,
		steps: helpers.patchJobSteps(
			jobId,
			"media",
			mediaOk ? "done" : "failed",
			mediaPlan.status,
		),
		failedSteps: mediaOk
			? priorFailed
			: [
					...priorFailed,
					{ stepId: "media", error: `media plan status=${mediaPlan.status}` },
				],
	});
}

function mediaStepFailed(job: PostCallJob | undefined): boolean {
	return (job?.steps ?? []).some(function (s) {
		return s.id === "media" && s.status === "failed";
	});
}

export async function runMediaPhase(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	liveJob: PostCallJob,
	session: CallSession,
	profile: PlayerProfile,
	nowIso: string,
): Promise<boolean> {
	const hasDeferred = (liveJob.deferredEffects?.length ?? 0) > 0;
	const mediaPending = hasDeferred && !helpers.stepIsFinished(liveJob, "media");
	if (!mediaPending) {
		if (!helpers.stepIsFinished(liveJob, "media")) {
			await helpers.setPostCallJob(jobId, {
				steps: helpers.patchJobSteps(jobId, "media", "skipped"),
			});
		}
		return true;
	}
	await helpers.setPostCallJob(jobId, {
		status: "media_running",
		steps: helpers.patchJobSteps(jobId, "media", "running"),
	});
	await deps.enqueueProfileWrite(liveJob.userId, function () {
		return executeDeferredMediaEffects(
			deps,
			helpers,
			jobId,
			liveJob,
			session,
			profile,
			nowIso,
		);
	});
	if (mediaStepFailed(deps.postCallJobs.get(jobId))) {
		await helpers.setPostCallJob(jobId, { status: "failed_retryable" });
		return false;
	}
	return true;
}

/** 语音信箱物化；失败写 failed_retryable。 */
export async function runVoicemailPhase(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	afterMedia: PostCallJob,
	profile: PlayerProfile,
	nowIso: string,
): Promise<boolean> {
	if (!afterMedia.voicemailPending || helpers.stepIsFinished(afterMedia, "voicemail")) {
		if (!helpers.stepIsFinished(afterMedia, "voicemail")) {
			await helpers.setPostCallJob(jobId, {
				steps: helpers.patchJobSteps(jobId, "voicemail", "skipped"),
			});
		}
		return true;
	}
	await helpers.setPostCallJob(jobId, {
		status: "voicemail_running",
		steps: helpers.patchJobSteps(jobId, "voicemail", "running"),
	});
	await deps.enqueueProfileWrite(afterMedia.userId, async function () {
		try {
			await materializeVoicemailsAfterPlan({
				profile,
				nowIso,
				lookupCard: deps.lookupCard,
				ports: deps.voicemailPorts,
			});
			await helpers.setPostCallJob(jobId, {
				steps: helpers.patchJobSteps(jobId, "voicemail", "done"),
				voicemailPending: false,
			});
		} catch (err) {
			await helpers.setPostCallJob(jobId, {
				status: "failed_retryable",
				steps: helpers.patchJobSteps(jobId, "voicemail", "failed", errorMessage(err)),
				failedSteps: [
					...(deps.postCallJobs.get(jobId)?.failedSteps ?? []),
					{ stepId: "voicemail", error: errorMessage(err) },
				],
			});
		}
		await deps.saveProfile(afterMedia.userId, "after_effect");
	});
	return deps.postCallJobs.get(jobId)?.status !== "failed_retryable";
}

/** 串行跑四阶段；任一步 false 即停，未捕获异常记 background 失败。 */
async function runBackgroundPhases(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
	job: PostCallJob,
	session: CallSession,
	profile: PlayerProfile,
	nowIso: string,
): Promise<void> {
	if (!(await runMemoryPhase(deps, helpers, jobId, job, session, nowIso))) return;
	if (!(await runRollupPhase(deps, helpers, jobId, job, nowIso))) return;
	const liveJob = deps.postCallJobs.get(jobId) ?? job;
	if (!(await runMediaPhase(deps, helpers, jobId, liveJob, session, profile, nowIso))) {
		return;
	}
	const afterMedia = deps.postCallJobs.get(jobId) ?? liveJob;
	if (!(await runVoicemailPhase(deps, helpers, jobId, afterMedia, profile, nowIso))) {
		return;
	}
	const failed = deps.postCallJobs.get(jobId)?.failedSteps?.length ?? 0;
	await helpers.setPostCallJob(jobId, {
		status: failed > 0 ? "completed_with_errors" : "completed",
	});
}

export async function runPostCallBackgroundJob(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
	jobId: string,
): Promise<void> {
	const job = deps.postCallJobs.get(jobId);
	if (!job || !job.syncCommitted) return;
	const session = deps.sessions.get(job.sessionId) ?? job.sessionSnapshot;
	const profile = deps.profiles.get(job.userId);
	if (!session || !profile) {
		await helpers.setPostCallJob(jobId, {
			status: "failed_retryable",
			failedSteps: [
				...(job.failedSteps ?? []),
				{ stepId: "session_or_profile", error: "missing session or profile" },
			],
		});
		return;
	}
	if (!deps.sessions.has(job.sessionId)) {
		deps.sessions.set(job.sessionId, session);
	}
	const nowIso = new Date().toISOString();
	try {
		await runBackgroundPhases(deps, helpers, jobId, job, session, profile, nowIso);
	} catch (err) {
		await helpers.setPostCallJob(jobId, {
			status: "failed_retryable",
			failedSteps: [
				...(deps.postCallJobs.get(jobId)?.failedSteps ?? []),
				{ stepId: "background", error: errorMessage(err) },
			],
		});
	}
}
