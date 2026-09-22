/**
 * PostCallJob 内存 Store：方法实现拆出以降圈复杂度。
 */
import type { PostCallJob, PostCallJobStorePort } from "../../src/index.js";

const RUNNING = new Set([
	"closing",
	"committed",
	"memory_committing",
	"rollup_running",
	"media_running",
	"voicemail_running",
]);

async function createJobIfNoClash(
	jobs: Map<string, PostCallJob>,
	job: PostCallJob,
): Promise<void> {
	const clash = [...jobs.values()].some((j) => j.sessionId === job.sessionId);
	if (!clash) jobs.set(job.jobId, job);
}

async function updateJobInMap(
	jobs: Map<string, PostCallJob>,
	jobId: string,
	patch: Partial<PostCallJob>,
): Promise<PostCallJob | null> {
	const job = jobs.get(jobId);
	if (!job) return null;
	const next = { ...job, ...patch, jobId };
	jobs.set(jobId, next);
	return next;
}

function listJobsInMap(
	jobs: Map<string, PostCallJob>,
	filter?: {
		userId?: string;
		agentId?: string;
		statuses?: PostCallJob["status"][];
	},
): PostCallJob[] {
	return Array.from(jobs.values()).filter(function match(job) {
		if (filter?.userId && job.userId !== filter.userId) return false;
		if (filter?.agentId && job.primaryAgentId !== filter.agentId) {
			return false;
		}
		if (filter?.statuses?.length && !filter.statuses.includes(job.status)) {
			return false;
		}
		return true;
	});
}

async function claimPendingJob(
	jobs: Map<string, PostCallJob>,
	jobId: string,
): Promise<PostCallJob | null> {
	const job = jobs.get(jobId);
	if (!job || job.status !== "background_pending") return null;
	return updateJobInMap(jobs, jobId, { status: "memory_committing" });
}

async function reclaimRunningInMap(
	jobs: Map<string, PostCallJob>,
): Promise<string[]> {
	const ids: string[] = [];
	for (const [id, job] of jobs) {
		if (!RUNNING.has(job.status)) continue;
		jobs.set(id, { ...job, status: "background_pending" });
		ids.push(id);
	}
	return ids;
}

export function inMemoryPostCallJobStore(
	seed: PostCallJob[] = [],
): PostCallJobStorePort {
	const jobs = new Map<string, PostCallJob>();
	for (const job of seed) jobs.set(job.jobId, job);
	return {
		async createJob(job) {
			await createJobIfNoClash(jobs, job);
		},
		async updateJob(jobId, patch) {
			return updateJobInMap(jobs, jobId, patch);
		},
		async getJob(jobId) {
			return jobs.get(jobId) ?? null;
		},
		async listJobs(filter) {
			return listJobsInMap(jobs, filter);
		},
		async claimJob(jobId) {
			return claimPendingJob(jobs, jobId);
		},
		async reclaimRunningJobs() {
			return reclaimRunningInMap(jobs);
		},
	};
}
