/**
 * 模块名称：PostCallJob 后台运行时（薄工厂）
 * 模块说明：装配 job 镜像 / 步骤补丁 / 后台调度；阶段实现见 postCallJobPhases。
 */
import type { CallSession, PostCallJob, PostCallJobSummary } from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { MemoryPort } from "../memory/types.js";
import type { EffectSink } from "../runtime/effectSink.js";
import type { PostCallJobStorePort } from "../ports/postCallJobStorePort.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import type { VoicemailMaterializeHostPorts } from "./materializeVoicemailsAfterPlan.js";
import {
	runPostCallBackgroundJob as runPostCallBackgroundJobPhases,
	type PostCallJobPhaseHelpers,
} from "./postCallJobPhases.js";

export const ACTIVE_POST_CALL_STATUSES = new Set<string>([
	"closing",
	"committed",
	"background_pending",
	"memory_committing",
	"rollup_running",
	"media_running",
	"voicemail_running",
	"failed_retryable",
]);

const TERMINAL_POST_CALL_STATUSES = new Set([
	"completed",
	"completed_with_errors",
	"aborted_non_retryable",
]);

export function isTerminalPostCallStatus(status: string): boolean {
	return TERMINAL_POST_CALL_STATUSES.has(status as never);
}

export function postCallJobSummary(job: PostCallJob): PostCallJobSummary {
	return {
		jobId: job.jobId,
		userId: job.userId,
		sessionId: job.sessionId,
		primaryAgentId: job.primaryAgentId,
		status: job.status,
		updatedAt: job.updatedAt,
		effectPlanStatus: job.effectPlanResult.status,
		selectedExitId: job.selectedExitId,
		steps: job.steps,
		failedSteps: job.failedSteps,
	};
}

export function buildBackgroundSteps(mediaCount: number): PostCallJob["steps"] {
	return [
		{ id: "memory_commit", status: "pending" },
		{ id: "rollup", status: "pending" },
		{ id: "media", status: mediaCount > 0 ? "pending" : "skipped" },
		{ id: "voicemail", status: "pending" },
	];
}

export interface PostCallJobRuntimeDeps {
	postCallJobs: Map<string, PostCallJob>;
	backgroundJobPromises: Map<string, Promise<void>>;
	sessions: Map<string, CallSession>;
	profiles: Map<string, PlayerProfile>;
	postCallJobStore: PostCallJobStorePort | null;
	getMemory: () => MemoryPort | null;
	effectSink: EffectSink;
	lookupCard: ScheduledCardLookup;
	voicemailPorts: VoicemailMaterializeHostPorts;
	enqueueProfileWrite: <T>(userId: string, fn: () => Promise<T>) => Promise<T>;
	saveProfile: (userId: string, reason: "after_effect") => Promise<void>;
}

/** 装配镜像与后台调度；阶段逻辑委托 postCallJobPhases。 */
export function createPostCallJobRuntime(deps: PostCallJobRuntimeDeps) {
	async function mirrorPostCallJob(job: PostCallJob): Promise<void> {
		if (!deps.postCallJobStore) return;
		const updated = await deps.postCallJobStore.updateJob(job.jobId, job);
		if (!updated) {
			await deps.postCallJobStore.createJob(job);
		}
	}

	async function setPostCallJob(
		jobId: string,
		patch: Partial<PostCallJob>,
	): Promise<PostCallJob | null> {
		const job = deps.postCallJobs.get(jobId);
		if (!job) return null;
		const next: PostCallJob = {
			...job,
			...patch,
			updatedAt: new Date().toISOString(),
		};
		deps.postCallJobs.set(jobId, next);
		await mirrorPostCallJob(next);
		return next;
	}

	function patchJobSteps(
		jobId: string,
		stepId: PostCallJob["steps"][number]["id"],
		status: PostCallJob["steps"][number]["status"],
		detail?: string,
	): PostCallJob["steps"] {
		const current = deps.postCallJobs.get(jobId)?.steps ?? [];
		return current.map(function (step) {
			if (step.id !== stepId) return step;
			return { ...step, status, detail: detail ?? step.detail };
		});
	}

	function stepIsFinished(
		job: PostCallJob,
		stepId: PostCallJob["steps"][number]["id"],
	): boolean {
		const step = job.steps.find(function (s) {
			return s.id === stepId;
		});
		return (
			step?.status === "done" ||
			step?.status === "skipped" ||
			step?.status === "failed"
		);
	}

	const helpers: PostCallJobPhaseHelpers = {
		setPostCallJob,
		patchJobSteps,
		stepIsFinished,
	};

	async function runPostCallBackgroundJob(jobId: string): Promise<void> {
		await runPostCallBackgroundJobPhases(deps, helpers, jobId);
	}

	function startPostCallBackgroundJob(jobId: string): void {
		if (deps.backgroundJobPromises.has(jobId)) return;
		const running = runPostCallBackgroundJob(jobId);
		deps.backgroundJobPromises.set(jobId, running);
		void running.finally(function () {
			deps.backgroundJobPromises.delete(jobId);
		});
	}

	return {
		mirrorPostCallJob,
		setPostCallJob,
		runPostCallBackgroundJob,
		startPostCallBackgroundJob,
		postCallJobSummary,
		buildBackgroundSteps,
		isTerminalPostCallStatus,
	};
}
