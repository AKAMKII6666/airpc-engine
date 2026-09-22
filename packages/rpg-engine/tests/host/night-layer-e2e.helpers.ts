/**
 * E4d night／late_night 层集成测步骤。
 */
import { expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isEngineError } from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

export async function beginIntroAt(input: {
	dataSrc: string;
	localNowIso: string;
}) {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4d-night-"));
	const dataRoot = path.join(tmpRoot, "data");
	await copyDataTree(input.dataSrc, dataRoot);

	const host = createTestHost({ persist: false, dataRoot });
	await host.loadWorkspace(dataRoot);
	await host.ensureProfile("demo-user");

	const resolved = await host.resolveAsync("demo-user", {
		kind: "simulate_start",
		chapterId: "golden_handoff",
		cardId: "doubao_intro_outbound",
	});
	if (isEngineError(resolved)) throw resolved;

	const session = await host.beginCall("demo-user", resolved, {
		channel: "manual",
		localNowIso: input.localNowIso,
		timeZone: "Asia/Shanghai",
	});
	if (isEngineError(session)) throw session;
	return { tmpRoot, host, session };
}

export async function assertNightLayerHit(input: {
	dataSrc: string;
}): Promise<string> {
	const { tmpRoot, host, session } = await beginIntroAt({
		dataSrc: input.dataSrc,
		localNowIso: "2026-07-13T22:30:00+08:00",
	});
	expect(session.composeScene.callDirection).toBe("outbound");
	expect(session.composeScene.localTime.localHour).toBe(22);
	expect(session.matchedLayerIds).toEqual(
		expect.arrayContaining(["outbound_any", "outbound_night"]),
	);
	expect(session.matchedLayerIds).not.toContain("outbound_late_night");
	expect(session.matchedLayerIds).not.toContain("outbound_afternoon");
	expect(session.renderedPrompt?.openingSpeakable).toContain("这么晚");
	expect(
		session.renderedPrompt?.systemHard.some((s) =>
			s.includes("[用户本地时间]"),
		),
	).toBe(true);
	expect(
		session.renderedPrompt?.systemHard.some((s) =>
			s.includes("22:30:00+08:00"),
		),
	).toBe(true);

	await host.endCall(session.sessionId, {
		flags: { hangup_early: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	return tmpRoot;
}

export async function assertLateNightLayerHit(input: {
	dataSrc: string;
}): Promise<string> {
	const { tmpRoot, host, session } = await beginIntroAt({
		dataSrc: input.dataSrc,
		localNowIso: "2026-07-14T02:15:00+08:00",
	});
	expect(session.composeScene.localTime.localHour).toBe(2);
	expect(session.matchedLayerIds).toEqual(
		expect.arrayContaining(["outbound_any", "outbound_late_night"]),
	);
	expect(session.matchedLayerIds).not.toContain("outbound_night");
	expect(session.renderedPrompt?.openingSpeakable).toContain("还醒着");
	expect(
		session.renderedPrompt?.systemHard.some((s) =>
			s.includes("02:15:00+08:00"),
		),
	).toBe(true);

	await host.endCall(session.sessionId, {
		flags: { hangup_early: true },
		completedBeats: [],
		missedRequiredBeats: [],
	});
	return tmpRoot;
}
