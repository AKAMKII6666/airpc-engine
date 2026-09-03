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

export function createJobMutations(io: JobsIo) {
	return {
		async createJob(job: PostCallJob): Promise<void> {
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
		},

		async updateJob(
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
		},

		async claimJob(jobId: string): Promise<PostCallJob | null> {
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
		},

		async reclaimRunningJobs(): Promise<string[]> {
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
		},
	};
}
