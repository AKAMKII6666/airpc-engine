/**
 * PostCallJob memory_commit 阶段：Free / Story 两条提交路径。
 * 从 postCallJobPhases 拆出以压文件行数告警。
 */
import type { CallSession, PostCallJob } from "../../types.js";
import { runFreeCallMemoryCommit } from "../../../runtime/memory/freeCallPostPipeline.js";
import {
	commitStoryCallMemory,
	type StoryCallMemoryCommitResult,
} from "../../../runtime/memory/storyCallMemoryCommit.js";
import type {
	PostCallJobPhaseHelpers,
	PostCallJobRuntimeDeps,
} from "../runtime/postCallJobRuntime.js";

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** Free 记忆提交；失败写 failed_retryable。 */
export async function runFreeMemoryCommit(
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

/** Story 记忆提交；commit_failed 写 failed_retryable。 */
export async function runStoryMemoryCommit(
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
