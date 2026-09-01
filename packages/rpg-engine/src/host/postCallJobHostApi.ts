/**
 * Host 上 PostCallJob 查询 / 恢复 / 重试 / drain。
 * 从 createEngineHost 拆出以降基线。
 */
import { engineError, type EngineError } from "./errors.js";
import type { CallSession, PostCallJob, PostCallJobSummary } from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { PostCallJobStorePort } from "../ports/postCallJobStorePort.js";
import {
	isTerminalPostCallStatus,
	postCallJobSummary,
} from "./postCallJobRuntime.js";

export interface PostCallJobHostApiDeps {
	postCallJobs: Map<string, PostCallJob>;
	sessions: Map<string, CallSession>;
	profiles: Map<string, PlayerProfile>;
	backgroundJobPromises: Map<string, Promise<void>>;
	postCallJobStore: PostCallJobStorePort | null;
	setPostCallJob: (
		jobId: string,
		patch: Partial<PostCallJob>,
	) => Promise<PostCallJob | null>;
	startPostCallBackgroundJob: (jobId: string) => void;
	runPostCallBackgroundJob: (jobId: string) => Promise<void>;
}

function getPostCallJob(
	deps: PostCallJobHostApiDeps,
	jobId: string,
): PostCallJob | null {
	return deps.postCallJobs.get(jobId) ?? null;
}

function listPostCallJobs(
	deps: PostCallJobHostApiDeps,
	filter?: {
		userId?: string;
		agentId?: string;
		statuses?: PostCallJob["status"][];
	},
): PostCallJob[] {
	const statuses = filter?.statuses;
	return Array.from(deps.postCallJobs.values()).filter(function (job) {
		if (filter?.userId && job.userId !== filter.userId) return false;
		if (filter?.agentId && job.primaryAgentId !== filter.agentId) return false;
		if (statuses && statuses.length > 0 && !statuses.includes(job.status)) {
			return false;
		}
		return true;
	});
}

async function recoverOneJob(
	deps: PostCallJobHostApiDeps,
	job: PostCallJob,
	summaries: PostCallJobSummary[],
): Promise<void> {
	if (isTerminalPostCallStatus(job.status)) {
		deps.postCallJobs.set(job.jobId, job);
		summaries.push(postCallJobSummary(job));
		return;
	}
	// 必须先入内存 Map，否则 setPostCallJob 空操作
	deps.postCallJobs.set(job.jobId, job);
	const profile = deps.profiles.get(job.userId);
	if (!profile) {
		await deps.setPostCallJob(job.jobId, {
			status: "failed_retryable",
			failedSteps: [
				...(job.failedSteps ?? []),
				{ stepId: "profile", error: "profile not loaded" },
			],
		});
		summaries.push(postCallJobSummary(deps.postCallJobs.get(job.jobId)!));
		return;
	}
	if (!job.sessionSnapshot) {
		await deps.setPostCallJob(job.jobId, {
			status: "failed_retryable",
			failedSteps: [
				...(job.failedSteps ?? []),
				{ stepId: "session", error: "session snapshot missing" },
			],
		});
		summaries.push(postCallJobSummary(deps.postCallJobs.get(job.jobId)!));
		return;
	}
	if (!job.syncCommitted) {
		await deps.setPostCallJob(job.jobId, {
			status: "failed_retryable",
			failedSteps: [
				...(job.failedSteps ?? []),
				{
					stepId: "sync_effects",
					error: "sync not committed; retryPostCallJob cannot resume",
				},
			],
		});
		summaries.push(postCallJobSummary(deps.postCallJobs.get(job.jobId)!));
		return;
	}
	deps.sessions.set(job.sessionId, job.sessionSnapshot);
	await deps.setPostCallJob(job.jobId, { status: "background_pending" });
	deps.startPostCallBackgroundJob(job.jobId);
	summaries.push(postCallJobSummary(deps.postCallJobs.get(job.jobId)!));
}

async function recoverPostCallJobs(
	deps: PostCallJobHostApiDeps,
): Promise<PostCallJobSummary[] | EngineError> {
	if (!deps.postCallJobStore) {
		return engineError(
			"ENGINE_INTERNAL",
			"PostCallJobStorePort required for recoverPostCallJobs",
		);
	}
	const reclaimed = await deps.postCallJobStore.reclaimRunningJobs();
	const jobs = await deps.postCallJobStore.listJobs();
	const summaries: PostCallJobSummary[] = [];
	for (const job of jobs) {
		await recoverOneJob(deps, job, summaries);
	}
	void reclaimed;
	return summaries;
}

async function retryPostCallJob(
	deps: PostCallJobHostApiDeps,
	jobId: string,
): Promise<PostCallJobSummary | EngineError> {
	const job = deps.postCallJobs.get(jobId);
	if (!job) {
		return engineError("NOT_FOUND", `post-call job not found: ${jobId}`);
	}
	if (job.status !== "failed_retryable") {
		return engineError(
			"ENGINE_INTERNAL",
			`post-call job not retryable: ${job.status}`,
		);
	}
	if (!job.syncCommitted) {
		return engineError(
			"ENGINE_INTERNAL",
			"sync stage failed; cannot retry background post-call job",
		);
	}
	if (job.sessionSnapshot) {
		deps.sessions.set(job.sessionId, job.sessionSnapshot);
	}
	const resetSteps = job.steps.map(function (step) {
		if (step.status === "failed") {
			return { ...step, status: "pending" as const, detail: undefined };
		}
		return step;
	});
	await deps.setPostCallJob(jobId, {
		attempt: job.attempt + 1,
		status: "background_pending",
		failedSteps: [],
		steps: resetSteps,
		voicemailPending:
			job.voicemailPending ||
			resetSteps.some(function (s) {
				return s.id === "voicemail" && s.status === "pending";
			}),
	});
	if (deps.postCallJobStore) {
		deps.startPostCallBackgroundJob(jobId);
	} else {
		await deps.runPostCallBackgroundJob(jobId);
	}
	return postCallJobSummary(deps.postCallJobs.get(jobId)!);
}

async function drainPostCallJobs(deps: PostCallJobHostApiDeps): Promise<void> {
	while (deps.backgroundJobPromises.size > 0) {
		await Promise.allSettled(Array.from(deps.backgroundJobPromises.values()));
	}
}

/** 装配 get/list/recover/retry/drain，供 EngineHost 对象字面量展开。 */
export function createPostCallJobHostApi(deps: PostCallJobHostApiDeps) {
	return {
		getPostCallJob(jobId: string) {
			return getPostCallJob(deps, jobId);
		},
		listPostCallJobs(filter?: {
			userId?: string;
			agentId?: string;
			statuses?: PostCallJob["status"][];
		}) {
			return listPostCallJobs(deps, filter);
		},
		recoverPostCallJobs() {
			return recoverPostCallJobs(deps);
		},
		retryPostCallJob(jobId: string) {
			return retryPostCallJob(deps, jobId);
		},
		drainPostCallJobs() {
			return drainPostCallJobs(deps);
		},
	};
}
