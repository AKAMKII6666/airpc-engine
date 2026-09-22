/**
 * Manual Story 闭环集成测步骤。
 */
import { expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	isEngineError,
	type PlayerProfile,
} from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

async function assertManualLoopSavedEffects(
	dataRoot: string,
	sessionId: string,
): Promise<void> {
	const saved = JSON.parse(
		await readFile(
			path.join(dataRoot, "users/demo-user/profile.save.json"),
			"utf8",
		),
	) as PlayerProfile;

	expect(saved.characters.xiaopi?.unlocked).toBe(true);
	expect(saved.telephony?.redialSlot?.agentId).toBe("xiaopi");
	expect(saved.telephony?.redialSlot?.cardId).toBe("xiaopi_waiting_user");
	const pending = saved.callCards.board.byAgent.xiaopi?.pending ?? [];
	expect(pending.some((p) => p.cardId === "xiaopi_waiting_user")).toBe(true);
	expect(JSON.stringify(saved)).not.toContain(sessionId);
}

export async function runManualStoryLoop(dataSrc: string): Promise<string> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p1-"));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(dataSrc, dataRoot);

	const host = createTestHost({ persist: true, dataRoot });
	await host.loadWorkspace(dataRoot);
	await host.ensureProfile("demo-user");

	const resolved = await host.resolveAsync("demo-user", {
		kind: "simulate_start",
		chapterId: "golden_handoff",
		cardId: "doubao_intro_outbound",
	});
	expect(isEngineError(resolved)).toBe(false);
	if (isEngineError(resolved)) return tmpRoot;

	const session = await host.beginCall("demo-user", resolved, {
		channel: "manual",
		localNowIso: "2026-07-13T16:00:00+08:00",
		timeZone: "Asia/Shanghai",
	});
	expect(isEngineError(session)).toBe(false);
	if (isEngineError(session)) return tmpRoot;
	expect(session.composeScene.callDirection).toBe("outbound");
	expect(session.composeScene.localTime.localHour).toBe(16);
	expect(session.matchedLayerIds).toEqual(
		expect.arrayContaining(["outbound_any", "outbound_afternoon"]),
	);
	expect(session.renderedPrompt?.openingSpeakable).toContain("下午");
	expect(
		session.renderedPrompt?.systemHard.some((s) =>
			s.includes("[用户本地时间]"),
		),
	).toBe(true);
	expect(session.status).toBe("in_call");

	const end = await host.endCall(session.sessionId, {
		flags: { answered_completed: true },
		completedBeats: ["user_knows_to_call_xiaopi"],
		missedRequiredBeats: [],
	});
	expect(isEngineError(end)).toBe(false);
	if (isEngineError(end)) return tmpRoot;
	expect(end.selectedExitId).toBe("success_handoff");
	expect(end.session.status).toBe("completed");
	expect(host.getActiveSession("demo-user")).toBeNull();

	await assertManualLoopSavedEffects(dataRoot, session.sessionId);
	return tmpRoot;
}

export async function runRejectSecondBeginCall(
	dataSrc: string,
): Promise<string> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p1-mutex-"));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(dataSrc, dataRoot);

	const host = createTestHost({ persist: false, dataRoot });
	await host.loadWorkspace(dataRoot);
	await host.ensureProfile("demo-user");

	const resolved = await host.resolveAsync("demo-user", {
		kind: "simulate_start",
		chapterId: "golden_handoff",
		cardId: "doubao_intro_outbound",
	});
	if (isEngineError(resolved)) throw resolved;

	const first = await host.beginCall("demo-user", resolved, {
		channel: "manual",
	});
	if (isEngineError(first)) throw first;

	const second = await host.beginCall("demo-user", resolved, {
		channel: "manual",
	});
	expect(isEngineError(second)).toBe(true);
	if (isEngineError(second)) {
		expect(second.code).toBe("CONFLICT_ACTIVE_CALL");
	}
	return tmpRoot;
}
