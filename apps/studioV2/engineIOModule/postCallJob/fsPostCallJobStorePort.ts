/**
 * 模块名称：本机 Fs PostCallJobStorePort
 * 模块说明：PostCallJob 持久化到 `data/post-call-jobs.json`。
 * 仅 Server / Host 装配可引用；禁止 Client。
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
	PostCallJob,
	PostCallJobListFilter,
	PostCallJobStorePort,
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

function jobsFilePath(dataRoot: string): string {
	return path.join(dataRoot, "post-call-jobs.json");
}

async function readJobs(file: string): Promise<PostCallJob[]> {
	try {
		const raw = JSON.parse(await readFile(file, "utf8")) as unknown;
		if (raw && typeof raw === "object" && Array.isArray((raw as { jobs?: unknown }).jobs)) {
			return (raw as { jobs: PostCallJob[] }).jobs;
		}
		return [];
	} catch {
		return [];
	}
}

async function writeJobs(file: string, jobs: PostCallJob[]): Promise<void> {
	await mkdir(path.dirname(file), { recursive: true });
	const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random()
		.toString(36)
		.slice(2)}.tmp`;
	await writeFile(tmp, JSON.stringify({ jobs }, null, 2) + "\n", "utf8");
	await rename(tmp, file);
}

export function createFsPostCallJobStorePort(dataRoot: string): PostCallJobStorePort {
	const file = jobsFilePath(dataRoot);
	/** 串行化读改写，避免并发 setPostCallJob 丢更新 */
	let writeChain: Promise<unknown> = Promise.resolve();

	function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
		const run = writeChain.then(fn, fn);
		writeChain = run.then(
			function () {
				return undefined;
			},
			function () {
				return undefined;
			},
		);
		return run;
	}

	return {
		async createJob(job: PostCallJob): Promise<void> {
			await enqueueWrite(async function () {
				const jobs = await readJobs(file);
				const exists = jobs.some(
					(item) =>
						item.jobId === job.jobId || item.sessionId === job.sessionId,
				);
				if (!exists) {
					jobs.push(job);
					await writeJobs(file, jobs);
				}
			});
		},

		async updateJob(
			jobId: string,
			patch: Partial<PostCallJob>,
		): Promise<PostCallJob | null> {
			return enqueueWrite(async function () {
				const jobs = await readJobs(file);
				const idx = jobs.findIndex((item) => item.jobId === jobId);
				if (idx < 0) return null;
				const next: PostCallJob = { ...jobs[idx]!, ...patch, jobId };
				jobs[idx] = next;
				await writeJobs(file, jobs);
				return next;
			});
		},

		async getJob(jobId: string): Promise<PostCallJob | null> {
			const jobs = await readJobs(file);
			return jobs.find((item) => item.jobId === jobId) ?? null;
		},

		async listJobs(filter?: PostCallJobListFilter): Promise<PostCallJob[]> {
			const jobs = await readJobs(file);
			const statuses = filter?.statuses;
			return jobs.filter(function (job) {
				if (filter?.userId && job.userId !== filter.userId) return false;
				if (filter?.agentId && job.primaryAgentId !== filter.agentId) return false;
				if (statuses && statuses.length > 0 && !statuses.includes(job.status)) {
					return false;
				}
				return true;
			});
		},

		async claimJob(jobId: string): Promise<PostCallJob | null> {
			return enqueueWrite(async function () {
				const jobs = await readJobs(file);
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
				await writeJobs(file, jobs);
				return next;
			});
		},

		async reclaimRunningJobs(): Promise<string[]> {
			return enqueueWrite(async function () {
				const jobs = await readJobs(file);
				const reclaimed: string[] = [];
				for (const job of jobs) {
					if (RUNNING_STATUSES.has(job.status)) {
						job.status = "background_pending";
						reclaimed.push(job.jobId);
					}
				}
				if (reclaimed.length > 0) {
					await writeJobs(file, jobs);
				}
				return reclaimed;
			});
		},
	};
}
