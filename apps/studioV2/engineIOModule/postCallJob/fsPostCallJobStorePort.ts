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
} from "@airpc/rpg-engine";
import { createJobMutations } from "./fsPostCallJobMutations";

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

	const io = {
		readJobs: function () {
			return readJobs(file);
		},
		writeJobs: function (jobs: PostCallJob[]) {
			return writeJobs(file, jobs);
		},
		enqueueWrite,
	};
	const mutations = createJobMutations(io);

	return {
		createJob: mutations.createJob,
		updateJob: mutations.updateJob,
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
		claimJob: mutations.claimJob,
		reclaimRunningJobs: mutations.reclaimRunningJobs,
	};
}
