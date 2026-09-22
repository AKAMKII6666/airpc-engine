/**
 * PostCallJob 运行时内部助手：镜像、步骤补丁、后台调度装配。
 * 从 createPostCallJobRuntime 抽出以压函数行数告警。
 */
import type { PostCallJob } from "../../types.js";
import type {
	PostCallJobPhaseHelpers,
	PostCallJobRuntimeDeps,
} from "./postCallJobRuntime.js";
import { runPostCallBackgroundJob as runPostCallBackgroundJobPhases } from "../phases/postCallJobPhases.js";

function buildMirrorAndSetters(deps: PostCallJobRuntimeDeps): {
	mirrorPostCallJob: (job: PostCallJob) => Promise<void>;
	helpers: PostCallJobPhaseHelpers;
} {
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

	return {
		mirrorPostCallJob,
		helpers: { setPostCallJob, patchJobSteps, stepIsFinished },
	};
}

function buildBackgroundSchedulers(
	deps: PostCallJobRuntimeDeps,
	helpers: PostCallJobPhaseHelpers,
): {
	runPostCallBackgroundJob: (jobId: string) => Promise<void>;
	startPostCallBackgroundJob: (jobId: string) => void;
} {
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

	return { runPostCallBackgroundJob, startPostCallBackgroundJob };
}

/** 装配镜像 / 步骤助手 / 后台调度；工厂只做再导出。 */
export function buildPostCallJobRuntimeCore(deps: PostCallJobRuntimeDeps): {
	mirrorPostCallJob: (job: PostCallJob) => Promise<void>;
	setPostCallJob: PostCallJobPhaseHelpers["setPostCallJob"];
	runPostCallBackgroundJob: (jobId: string) => Promise<void>;
	startPostCallBackgroundJob: (jobId: string) => void;
} {
	const { mirrorPostCallJob, helpers } = buildMirrorAndSetters(deps);
	const schedulers = buildBackgroundSchedulers(deps, helpers);
	return {
		mirrorPostCallJob,
		setPostCallJob: helpers.setPostCallJob,
		...schedulers,
	};
}
