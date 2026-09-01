/**
 * PostCallJob 异步化、rollup、retry、recover 回归。
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEngineHost, isEngineError } from "../../src/index.js";
import type {
	CallSession,
	PostCallJob,
	PostCallJobStorePort,
	ResolvedCallIntent,
} from "../../src/index.js";
import {
	createInMemoryMemoryPort,
	createFsContentPort,
	createFsEngineLogPort,
	createFsProfilePort,
} from "../helpers/inMemoryMemoryPort.js";
import { copyDataTree } from "../helpers/copyDataTree.js";
import type { MemoryPort } from "../../src/memory/types.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

let tmpRoot: string | undefined;

afterEach(async function () {
	if (tmpRoot) {
		await rm(tmpRoot, { recursive: true, force: true });
		tmpRoot = undefined;
	}
});

async function copiedDataRoot(): Promise<string> {
	tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-post-call-"));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(dataSrc, dataRoot);
	return dataRoot;
}

const RUNNING = new Set([
	"closing",
	"committed",
	"memory_committing",
	"rollup_running",
	"media_running",
	"voicemail_running",
]);

function inMemoryPostCallJobStore(
	seed: PostCallJob[] = [],
): PostCallJobStorePort {
	const jobs = new Map<string, PostCallJob>();
	for (const job of seed) jobs.set(job.jobId, job);
	return {
		async createJob(job) {
			const clash = [...jobs.values()].some((j) => j.sessionId === job.sessionId);
			if (!clash) jobs.set(job.jobId, job);
		},
		async updateJob(jobId, patch) {
			const job = jobs.get(jobId);
			if (!job) return null;
			const next = { ...job, ...patch, jobId };
			jobs.set(jobId, next);
			return next;
		},
		async getJob(jobId) {
			return jobs.get(jobId) ?? null;
		},
		async listJobs(filter) {
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
		},
		async claimJob(jobId) {
			const job = jobs.get(jobId);
			if (!job || job.status !== "background_pending") return null;
			return this.updateJob(jobId, { status: "memory_committing" });
		},
		async reclaimRunningJobs() {
			const ids: string[] = [];
			for (const [id, job] of jobs) {
				if (!RUNNING.has(job.status)) continue;
				jobs.set(id, { ...job, status: "background_pending" });
				ids.push(id);
			}
			return ids;
		},
	};
}

function delayedMemory(ms: number): MemoryPort {
	const base = createInMemoryMemoryPort();
	return {
		...base,
		async commitAfterCall(input) {
			await new Promise((resolve) => setTimeout(resolve, ms));
			return base.commitAfterCall(input);
		},
		async rollupIfNeeded(input) {
			await new Promise((resolve) => setTimeout(resolve, 20));
			return base.rollupIfNeeded?.(input);
		},
	};
}

function createHost(
	dataRoot: string,
	memory: MemoryPort,
	store: PostCallJobStorePort,
) {
	return createEngineHost({
		persist: true,
		memory,
		profile: createFsProfilePort(dataRoot),
		content: createFsContentPort(),
		engineLog: createFsEngineLogPort(dataRoot),
		postCallJob: store,
	});
}

async function startFreeCall(host: ReturnType<typeof createEngineHost>) {
	await host.ensureProfile("demo-user");
	const resolved = await host.resolveAsync("demo-user", {
		kind: "free_call",
		agentId: "lanxing",
	});
	if (isEngineError(resolved)) throw resolved;
	const session = await host.beginCall("demo-user", resolved, {
		channel: "manual",
	});
	if (isEngineError(session)) throw session;
	return { resolved, session };
}

function freeResolvedFrom(
	resolved: Extract<ResolvedCallIntent, { ok: true }>,
	instanceId: string,
): Extract<ResolvedCallIntent, { ok: true }> {
	return {
		ok: true,
		source: "free",
		instanceId,
		cardId: resolved.cardId,
		agentId: "lanxing",
		chapterId: resolved.chapterId,
		intent: { kind: "free_call", agentId: "lanxing" },
		card: resolved.card,
	};
}

function sessionSnapshotFixture(sessionId: string): CallSession {
	const now = new Date().toISOString();
	return {
		schemaVersion: 1,
		sessionId,
		userId: "demo-user",
		chapterId: "__free__",
		status: "completed",
		startedAt: now,
		resolve: {
			source: "free",
			instanceId: "x",
			cardId: "lanxing_free",
			agentId: "lanxing",
			intent: { kind: "free_call", agentId: "lanxing" },
		},
		frozenCard: {
			cardId: "lanxing_free",
			cardKind: "free",
			title: "free",
			ownerAgentId: "lanxing",
			entryMode: "either",
			interactionMode: "realtime_dialogue",
			context: {},
			exits: [],
			toolPolicy: { mode: "inherit_free" },
		},
		composeScene: {
			callDirection: "inbound",
			localTime: {
				isoWithOffset: "2026-08-26T08:00:00+08:00",
				timeZone: "Asia/Shanghai",
				localHour: 8,
			},
			timeMentionPolicy: "allow_casual",
		},
		renderedPrompt: {
			systemHard: [],
			openingSpeakable: "",
			speakable: "",
			private: "",
			softContext: [],
			matchedLayerIds: [],
		},
		channel: "manual",
		interactionPhase: "done",
		phoneFlags: { answered_completed: true },
		completedBeats: [],
		toolTrace: [],
		exitCandidates: [],
		shellEvents: [],
		effectLedger: {},
		chatTurns: [{ role: "user", text: "recover me", at: now }],
		outcome: {
			flags: { answered_completed: true },
			completedBeats: [],
			missedRequiredBeats: [],
		},
	};
}

function recoverSeedJob(
	overrides: Pick<PostCallJob, "jobId" | "sessionId"> &
		Partial<Pick<PostCallJob, "sessionSnapshot">>,
): PostCallJob {
	return {
		schemaVersion: 1,
		userId: "demo-user",
		primaryAgentId: "lanxing",
		source: "free",
		cardId: "lanxing_free",
		chapterId: "__free__",
		outcomeFlags: { answered_completed: true },
		generation: 1,
		attempt: 1,
		status: "memory_committing",
		updatedAt: new Date().toISOString(),
		commitCursor: [],
		failedSteps: [],
		steps: [
			{ id: "memory_commit", status: "pending" },
			{ id: "rollup", status: "pending" },
			{ id: "media", status: "skipped" },
			{ id: "voicemail", status: "pending" },
		],
		effectPlanResult: { results: [], aborted: false, status: "completed" },
		memoryPolicy: "free",
		deferredEffects: [],
		voicemailPending: true,
		syncCommitted: true,
		sessionSnapshot: sessionSnapshotFixture(overrides.sessionId),
		...overrides,
	};
}

describe("PostCallJob busy", () => {
	it("endCall 立即返回 job 且主 NPC 占线", async () => {
		const dataRoot = await copiedDataRoot();
		const host = createHost(dataRoot, delayedMemory(80), inMemoryPostCallJobStore());
		await host.loadWorkspace(dataRoot);
		const { resolved, session } = await startFreeCall(host);
		const end = await host.endCall(session.sessionId, {
			flags: { answered_completed: true },
			completedBeats: [],
			missedRequiredBeats: [],
		});
		if (isEngineError(end)) throw end;

		expect(end.freePipeline?.committed).toBe(false);
		expect(
			[
				"background_pending",
				"memory_committing",
				"rollup_running",
				"media_running",
				"voicemail_running",
			].includes(end.postCallJob?.status ?? ""),
		).toBe(true);

		const busy = await host.beginCall(
			"demo-user",
			freeResolvedFrom(resolved, "busy-check"),
			{ channel: "manual" },
		);
		expect(isEngineError(busy)).toBe(true);
		if (isEngineError(busy)) expect(busy.code).toBe("AGENT_POST_CALL_BUSY");
		await host.drainPostCallJobs();
		expect(host.getPostCallJob(end.postCallJobId)?.status).toBe("completed");
	});

	it("job 未完成时可拨其它 NPC；drain 后主 NPC 释放", async () => {
		const dataRoot = await copiedDataRoot();
		const host = createHost(dataRoot, delayedMemory(80), inMemoryPostCallJobStore());
		await host.loadWorkspace(dataRoot);
		const { session } = await startFreeCall(host);
		const end = await host.endCall(session.sessionId, {
			flags: { answered_completed: true },
			completedBeats: [],
			missedRequiredBeats: [],
		});
		if (isEngineError(end)) throw end;

		const other = await host.resolveAsync("demo-user", {
			kind: "free_call",
			agentId: "bai-bansian",
		});
		if (isEngineError(other)) throw other;
		expect(
			isEngineError(await host.beginCall("demo-user", other, { channel: "manual" })),
		).toBe(false);

		await host.drainPostCallJobs();
		expect(host.getPostCallJob(end.postCallJobId)?.status).toBe("completed");
	});

});

describe("PostCallJob rollup + retry", () => {
	it("后台经历 rollup_running", async () => {
		const dataRoot = await copiedDataRoot();
		const host = createHost(dataRoot, delayedMemory(40), inMemoryPostCallJobStore());
		await host.loadWorkspace(dataRoot);
		const { session } = await startFreeCall(host);
		host.recordChatTurn(session.sessionId, {
			role: "user",
			text: "记住今天吃了蛋糕",
		});
		const end = await host.endCall(session.sessionId, {
			flags: { answered_completed: true },
			completedBeats: [],
			missedRequiredBeats: [],
		});
		if (isEngineError(end)) throw end;

		const seen = new Set<string>();
		const timer = setInterval(() => {
			const job = host.getPostCallJob(end.postCallJobId);
			if (job) seen.add(job.status);
		}, 5);
		await host.drainPostCallJobs();
		clearInterval(timer);
		expect(seen.has("rollup_running")).toBe(true);
		expect(host.getPostCallJob(end.postCallJobId)?.status).toBe("completed");
	});

	it("failed_retryable → retryPostCallJob → completed", async () => {
		const dataRoot = await copiedDataRoot();
		const base = createInMemoryMemoryPort();
		let failOnce = true;
		const memory: MemoryPort = {
			...base,
			async commitAfterCall(input) {
				if (failOnce) {
					failOnce = false;
					throw new Error("memory boom");
				}
				return base.commitAfterCall(input);
			},
		};
		const host = createHost(dataRoot, memory, inMemoryPostCallJobStore());
		await host.loadWorkspace(dataRoot);
		const { session } = await startFreeCall(host);
		host.recordChatTurn(session.sessionId, {
			role: "user",
			text: "记得我喜欢喝茶",
		});
		const end = await host.endCall(session.sessionId, {
			flags: { answered_completed: true },
			completedBeats: [],
			missedRequiredBeats: [],
		});
		if (isEngineError(end)) throw end;
		await host.drainPostCallJobs();
		expect(host.getPostCallJob(end.postCallJobId)?.status).toBe("failed_retryable");

		const retried = await host.retryPostCallJob(end.postCallJobId);
		if (isEngineError(retried)) throw retried;
		await host.drainPostCallJobs();
		expect(host.getPostCallJob(end.postCallJobId)?.status).toBe("completed");
	});
});

describe("PostCallJob recover", () => {
	it("recover：缺 profile → failed_retryable", async () => {
		const dataRoot = await copiedDataRoot();
		const host = createHost(
			dataRoot,
			createInMemoryMemoryPort(),
			inMemoryPostCallJobStore([
				recoverSeedJob({
					jobId: "job-no-profile",
					sessionId: "sess-no-profile",
				}),
			]),
		);
		await host.loadWorkspace(dataRoot);
		const recovered = await host.recoverPostCallJobs();
		if (isEngineError(recovered)) throw recovered;
		expect(host.getPostCallJob("job-no-profile")?.status).toBe("failed_retryable");
	});

	it("recover：有 snapshot 可重放到 completed", async () => {
		const dataRoot = await copiedDataRoot();
		const jobId = "job-recover-1";
		const host = createHost(
			dataRoot,
			createInMemoryMemoryPort(),
			inMemoryPostCallJobStore([
				recoverSeedJob({ jobId, sessionId: "sess-recover-1" }),
			]),
		);
		await host.loadWorkspace(dataRoot);
		await host.ensureProfile("demo-user");
		const recovered = await host.recoverPostCallJobs();
		if (isEngineError(recovered)) throw recovered;
		await host.drainPostCallJobs();
		expect(host.getPostCallJob(jobId)?.status).toBe("completed");
	});
});
