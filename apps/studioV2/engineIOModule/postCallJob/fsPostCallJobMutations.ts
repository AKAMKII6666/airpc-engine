/**
	* Fs PostCallJobStorePort：读改写类方法实现。
	*/
import type {
	PostCallJob,
	PostCallJobStatus,
} from "@airpc/rpg-engine";

const RUNNING_STATUSES = new Set<string>([
	"closing",
	"committed",
	"memory_committing",
	"rollup_running",
	"media_running",
	"voicemail_running",
]);

const CLAIMABLE = new Set<PostCallJobStatus>(["background_pending"]);

export type JobsIo = {
	readJobs: () => Promise<PostCallJob[]>;
	writeJobs: (jobs: PostCallJob[]) => Promise<void>;
	enqueueWrite: <T>(fn: () => Promise<T>) => Promise<T>;
};

async function createJobImpl(io: JobsIo, job: PostCallJob): Promise<void> {
	await io.enqueueWrite(async function () {
		const jobs = await io.readJobs();
		const exists = jobs.some(
			(item) =>
				item.jobId === job.jobId || item.sessionId === job.sessionId,
		);
		if (!exists) {
			jobs.push(job);
			await io.writeJobs(jobs);
		}
	});
}

async function updateJobImpl(
	io: JobsIo,
	jobId: string,
	patch: Partial<PostCallJob>,
): Promise<PostCallJob | null> {
	return io.enqueueWrite(async function () {
		const jobs = await io.readJobs();
		const idx = jobs.findIndex((item) => item.jobId === jobId);
		if (idx < 0) return null;
		const next: PostCallJob = { ...jobs[idx]!, ...patch, jobId };
		jobs[idx] = next;
		await io.writeJobs(jobs);
		return next;
	});
}

async function claimJobImpl(
	io: JobsIo,
	jobId: string,
): Promise<PostCallJob | null> {
	return io.enqueueWrite(async function () {
		const jobs = await io.readJobs();
		const idx = jobs.findIndex((item) => item.jobId === jobId);
		if (idx < 0) return null;
		const current = jobs[idx]!;
		if (!CLAIMABLE.has(current.status)) return null;
		const next: PostCallJob = {
			...current,
			status: "memory_committing",
			updatedAt: new Date().toISOString(),
		};
		jobs[idx] = next;
		await io.writeJobs(jobs);
		return next;
	});
}

async function reclaimRunningJobsImpl(io: JobsIo): Promise<string[]> {
	return io.enqueueWrite(async function () {
		const jobs = await io.readJobs();
		const reclaimed: string[] = [];
		for (const job of jobs) {
			if (RUNNING_STATUSES.has(job.status)) {
				job.status = "background_pending";
				reclaimed.push(job.jobId);
			}
		}
		if (reclaimed.length > 0) {
			await io.writeJobs(jobs);
		}
		return reclaimed;
	});
}

export function createJobMutations(io: JobsIo) {
	return {
		createJob: (job: PostCallJob) => createJobImpl(io, job),
		updateJob: (jobId: string, patch: Partial<PostCallJob>) =>
			updateJobImpl(io, jobId, patch),
		claimJob: (jobId: string) => claimJobImpl(io, jobId),
		reclaimRunningJobs: () => reclaimRunningJobsImpl(io),
	};
}
