/**
 * E4b A→B memory 集成测步骤。
 */
import { expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isEngineError } from "../../src/index.js";
import {
	copyDataTree,
	createTestHostWithMemory,
} from "../helpers/inMemoryMemoryPort.js";

type SavedProfileSlice = {
	world?: {
		facts?: Array<{ factId?: string }>;
		knowledge?: Record<string, string[]>;
	};
};

async function assertCrossAgentKnowledge(
	dataRoot: string,
): Promise<SavedProfileSlice> {
	const saved = JSON.parse(
		await readFile(
			path.join(dataRoot, "users/demo-user/profile.save.json"),
			"utf8",
		),
	) as SavedProfileSlice;
	expect(
		saved.world?.facts?.some((f) => f.factId === "doubao_shared_xiaopi_topic"),
	).toBe(true);
	expect(saved.world?.knowledge?.xiaopi).toContain(
		"doubao_shared_xiaopi_topic",
	);
	expect(saved.world?.knowledge?.["lanxing"] ?? []).not.toContain(
		"doubao_shared_xiaopi_topic",
	);
	return saved;
}

async function assertCrossAgentMemoryHits(
	host: ReturnType<typeof createTestHostWithMemory>,
): Promise<void> {
	const mem = host.getMemoryPort();
	expect(mem).toBeTruthy();
	const hits = await mem!.search({
		userId: "demo-user",
		agentId: "xiaopi",
		textQuery: "doubao_shared_xiaopi_topic",
		maxResults: 5,
	});
	expect(hits.length).toBeGreaterThan(0);
	expect(hits.some((h) => h.layer === "semantic")).toBe(true);
	expect(hits.some((h) => h.text.includes("澜星转告"))).toBe(true);

	const aHits = await mem!.search({
		userId: "demo-user",
		agentId: "lanxing",
		textQuery: "doubao_shared_xiaopi_topic",
		maxResults: 5,
	});
	expect(aHits.some((h) => h.text.includes("澜星转告"))).toBe(false);
}

export async function runLanxingWritesXiaopiMemory(
	dataSrc: string,
): Promise<string> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4b-ab-"));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(dataSrc, dataRoot);

	const host = createTestHostWithMemory({ persist: true, dataRoot });
	await host.loadWorkspace(dataRoot);
	await host.ensureProfile("demo-user");

	const resolved = await host.resolveAsync("demo-user", {
		kind: "simulate_start",
		chapterId: "golden_handoff",
		cardId: "doubao_a_writes_b",
	});
	if (isEngineError(resolved)) throw resolved;
	expect(resolved.agentId).toBe("lanxing");
	expect(resolved.cardId).toBe("doubao_a_writes_b");

	const session = await host.beginCall("demo-user", resolved, {
		channel: "manual",
	});
	if (isEngineError(session)) throw session;
	expect(session.resolve.agentId).toBe("lanxing");

	const end = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
		completedBeats: ["told_cross_agent"],
		missedRequiredBeats: [],
	});
	expect(isEngineError(end)).toBe(false);
	if (isEngineError(end)) return tmpRoot;
	expect(end.selectedExitId).toBe("a_writes_b_ok");
	expect(
		end.effectPlanResult.results.every((r) => r.status === "executed"),
	).toBe(true);

	await assertCrossAgentKnowledge(dataRoot);
	await assertCrossAgentMemoryHits(host);
	return tmpRoot;
}
