/**
 * 模块名称：调试器挂机后副作用 job 投影
 * 模块说明：Host PostCallJob → DebuggerPostCallJobView。
 */
import { isEngineError, type EngineHost, type PostCallJob } from "@airpc/rpg-engine";
import type { DebuggerPostCallJobView } from "@studio-v2/typeFiles/debugger/callSession";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";

function projectPostCallJob(job: PostCallJob): DebuggerPostCallJobView {
	return {
		jobId: job.jobId,
		userId: job.userId,
		sessionId: job.sessionId,
		primaryAgentId: job.primaryAgentId,
		status: job.status,
		updatedAt: job.updatedAt,
		effectPlanStatus: job.effectPlanResult.status,
		selectedExitId: job.selectedExitId ?? null,
		steps: job.steps,
		failedSteps: job.failedSteps,
	};
}

export async function listDebuggerPostCallJobs(
	host?: EngineHost,
): Promise<DebuggerPostCallJobView[]> {
	const activeHost = host ?? (await getStudioV2EngineHost());
	return activeHost
		.listPostCallJobs({ userId: "demo-user" })
		.map(projectPostCallJob);
}

export async function getDebuggerPostCallJob(
	jobId: string,
	host?: EngineHost,
): Promise<DebuggerPostCallJobView | null> {
	const activeHost = host ?? (await getStudioV2EngineHost());
	const job = activeHost.getPostCallJob(jobId);
	return job ? projectPostCallJob(job) : null;
}

export async function recoverDebuggerPostCallJobs(
	host?: EngineHost,
): Promise<DebuggerPostCallJobView[]> {
	const activeHost = host ?? (await getStudioV2EngineHost());
	const recovered = await activeHost.recoverPostCallJobs();
	if (isEngineError(recovered)) throw recovered;
	return listDebuggerPostCallJobs(activeHost);
}

export async function retryDebuggerPostCallJob(
	jobId: string,
	host?: EngineHost,
): Promise<DebuggerPostCallJobView> {
	const activeHost = host ?? (await getStudioV2EngineHost());
	const retried = await activeHost.retryPostCallJob(jobId);
	if (isEngineError(retried)) throw retried;
	const job = activeHost.getPostCallJob(retried.jobId);
	if (!job) {
		throw Object.assign(new Error("retry succeeded but job missing"), {
			code: "NOT_FOUND",
			status: 404,
		});
	}
	return projectPostCallJob(job);
}
