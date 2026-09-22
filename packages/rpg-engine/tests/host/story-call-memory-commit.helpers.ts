/**
 * Story / Free 通话记忆提交测步骤。
 */
import { expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isEngineError } from "../../src/index.js";
import type { MemoryPort } from "../../src/memory/types.js";
import {
	copyDataTree,
	createInMemoryMemoryPort,
	createTestHostWithMemory,
} from "../helpers/inMemoryMemoryPort.js";

async function copiedDataRoot(
	dataSrc: string,
	prefix: string,
): Promise<{ tmpRoot: string; dataRoot: string }> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(dataSrc, dataRoot);
	return { tmpRoot, dataRoot };
}

async function beginGoldenIntro(
	host: ReturnType<typeof createTestHostWithMemory>,
	channel: "text_turn" | "manual",
) {
	const resolved = await host.resolveAsync("demo-user", {
		kind: "simulate_start",
		chapterId: "golden_handoff",
		cardId: "doubao_intro_outbound",
	});
	if (isEngineError(resolved)) throw resolved;
	const session = await host.beginCall("demo-user", resolved, { channel });
	if (isEngineError(session)) throw session;
	return session;
}

export async function runStoryCommitWithTranscript(
	dataSrc: string,
): Promise<string> {
	const copied = await copiedDataRoot(dataSrc, "airpc-story-memory-");
	const host = createTestHostWithMemory({
		persist: true,
		dataRoot: copied.dataRoot,
	});
	await host.loadWorkspace(copied.dataRoot);
	await host.ensureProfile("demo-user");
	const session = await beginGoldenIntro(host, "text_turn");

	const u1 = host.recordChatTurn(session.sessionId, {
		role: "user",
		text: "今天妈妈做的生日蛋糕让我特别开心。",
	});
	if (isEngineError(u1)) throw u1;
	const a1 = host.recordChatTurn(session.sessionId, {
		role: "assistant",
		text: "我记住了，这是值得以后再轻轻提起的开心。",
	});
	if (isEngineError(a1)) throw a1;

	const end = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
		completedBeats: ["user_knows_to_call_xiaopi"],
		missedRequiredBeats: [],
	});
	expect(isEngineError(end)).toBe(false);
	if (isEngineError(end)) return copied.tmpRoot;
	expect(end.storyMemoryCommit).toMatchObject({ committed: true });
	expect(end.freePipeline).toBeUndefined();

	const hits = await host.getMemoryPort()!.search({
		userId: "demo-user",
		agentId: "lanxing",
		textQuery: "生日蛋糕",
		maxResults: 5,
	});
	expect(hits.some((hit) => hit.kind === "call_summary")).toBe(true);
	expect(hits.find((hit) => hit.kind === "call_summary")?.text).not.toContain(
		"assistant:",
	);
	expect(hits.find((hit) => hit.kind === "call_summary")?.text).not.toContain(
		"轻轻提起",
	);
	return copied.tmpRoot;
}

export async function runNoExitStoryStillCommits(
	dataSrc: string,
): Promise<string> {
	const copied = await copiedDataRoot(dataSrc, "airpc-story-no-exit-memory-");
	const host = createTestHostWithMemory({
		persist: true,
		dataRoot: copied.dataRoot,
	});
	await host.loadWorkspace(copied.dataRoot);
	await host.ensureProfile("demo-user");
	const session = await beginGoldenIntro(host, "text_turn");
	session.frozenCard.exits = [];

	const turn = host.recordChatTurn(session.sessionId, {
		role: "user",
		text: "我刚搬到杭州，最近很想念以前的朋友。",
	});
	if (isEngineError(turn)) throw turn;

	const end = await host.endCall(session.sessionId, {
		flags: { answered_completed: false },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	expect(isEngineError(end)).toBe(true);
	expect(host.getActiveSession("demo-user")).toBeNull();
	const ended = host.getSession(session.sessionId);
	expect(ended?.status).toBe("aborted");
	expect(ended?.endedAt).toBeTruthy();

	const hits = await host.getMemoryPort()!.search({
		userId: "demo-user",
		agentId: "lanxing",
		textQuery: "杭州",
		maxResults: 5,
	});
	expect(hits.some((hit) => hit.kind === "call_summary")).toBe(true);
	return copied.tmpRoot;
}

export async function runFreeHangupWhenMemoryThrows(
	dataSrc: string,
): Promise<string> {
	const copied = await copiedDataRoot(dataSrc, "airpc-free-memory-fail-");
	const baseMemory = createInMemoryMemoryPort();
	const brokenMemory: MemoryPort = {
		...baseMemory,
		async commitAfterCall() {
			throw new Error("memory db unavailable");
		},
	};
	const host = createTestHostWithMemory({
		persist: true,
		dataRoot: copied.dataRoot,
		memory: brokenMemory,
	});
	await host.loadWorkspace(copied.dataRoot);
	await host.ensureProfile("demo-user");

	const resolved = await host.resolveAsync("demo-user", {
		kind: "free_call",
		agentId: "lanxing",
	});
	if (isEngineError(resolved)) throw resolved;
	const session = await host.beginCall("demo-user", resolved, {
		channel: "text_turn",
	});
	if (isEngineError(session)) throw session;
	const turn = host.recordChatTurn(session.sessionId, {
		role: "user",
		text: "这通自由电话即使记忆失败也要能挂断。",
	});
	if (isEngineError(turn)) throw turn;

	const end = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	expect(isEngineError(end)).toBe(false);
	if (isEngineError(end)) return copied.tmpRoot;
	expect(end.session.status).toBe("completed");
	expect(end.postCallJob?.status).toBe("failed_retryable");
	expect(host.getActiveSession("demo-user")).toBeNull();
	return copied.tmpRoot;
}

export async function runStorySkipEmptyTranscript(
	dataSrc: string,
): Promise<string> {
	const copied = await copiedDataRoot(dataSrc, "airpc-story-no-memory-");
	const host = createTestHostWithMemory({
		persist: true,
		dataRoot: copied.dataRoot,
	});
	await host.loadWorkspace(copied.dataRoot);
	await host.ensureProfile("demo-user");
	const session = await beginGoldenIntro(host, "manual");

	const end = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
		completedBeats: ["user_knows_to_call_xiaopi"],
		missedRequiredBeats: [],
	});
	expect(isEngineError(end)).toBe(false);
	if (isEngineError(end)) return copied.tmpRoot;
	expect(end.storyMemoryCommit).toEqual({
		committed: false,
		skippedReason: "empty_transcript",
	});
	return copied.tmpRoot;
}
