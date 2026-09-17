/**
 * 回归：挂机 attach_call_card(voicemail) 必须先 preload 目标卡，
 * 否则 lookup 认不出 cardKind → 误写 Board.pending。
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
	isEngineError,
	listVoicemailGenStack,
	type EngineHost,
	type PlayerProfile,
} from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function prepareCallbackHost(dataRoot: string): Promise<EngineHost> {
	const host = createTestHost({ persist: false, dataRoot });
	await host.loadWorkspace(dataRoot, { resetRuntime: true });
	const profile = await host.ensureProfile("demo-user");
	profile.characters.lanxing = { agentId: "lanxing", unlocked: true };
	profile.stories.wrong_number_act1 = {
		chapterId: "wrong_number_act1",
		status: "active",
		variables: {},
		lock: {
			activeStoryInstanceId: "inst-vm-attach",
			chapterId: "wrong_number_act1",
			lockLevel: "soft",
			allowedAgentIds: ["lanxing"],
			blockedPolicy: "allow_with_warning",
			reason: "vm-attach-preload",
			startedAt: "2026-07-23T00:00:00.000Z",
		},
	};
	profile.callCards.board.byAgent.lanxing = { pending: [] };
	profile.telephony = {};
	return host;
}

function expectVoicemailDiverted(profile: PlayerProfile): void {
	const pending = profile.callCards.board.byAgent.lanxing?.pending ?? [];
	const stack = listVoicemailGenStack(profile);
	const voicemails = profile.telephony?.voicemails ?? [];
	expect(pending.some((item) => item.cardId === "lanxing_voicemail")).toBe(false);
	expect(stack.length + voicemails.length).toBeGreaterThan(0);
	const delivered = stack[0] ?? voicemails[0];
	expect(delivered).toEqual(
		expect.objectContaining({
			cardId: "lanxing_voicemail",
			chapterId: "wrong_number_act1",
			...(stack[0] ? { source: "attach" } : {}),
		}),
	);
}

describe("attach_call_card voicemail preload (host)", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("callback 未勾拍挂机 → GenStack，不写 Board.pending", async () => {
		tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-vm-attach-"));
		const dataRoot = path.join(tmpRoot, "data");
		await copyDataTree(dataSrc, dataRoot);

		const host = await prepareCallbackHost(dataRoot);

		const preCallback = await host.preloadCard(
			"wrong_number_act1",
			"lanxing_callback_intro",
		);
		expect(isEngineError(preCallback)).toBe(false);

		const resolved = await host.resolveAsync("demo-user", {
			kind: "simulate_start",
			chapterId: "wrong_number_act1",
			cardId: "lanxing_callback_intro",
		});
		expect(isEngineError(resolved)).toBe(false);
		if (isEngineError(resolved)) return;

		const session = await host.beginCall("demo-user", resolved, {
			channel: "manual",
		});
		expect(isEngineError(session)).toBe(false);
		if (isEngineError(session)) return;

		// 故意不 preload lanxing_voicemail：挂机路径必须自行 preload
		const end = await host.endCall(session.sessionId, {
			flags: { answered_completed: true, hangup_early: false },
			completedBeats: [],
			missedRequiredBeats: ["自报姓名", "留下号码", "提起小皮露营"],
		});
		expect(isEngineError(end)).toBe(false);
		if (isEngineError(end)) return;
	expect(end.selectedExitId).toBe("exit_9ab52d03377a4db2b31192d7e613535f");

		// 分流成功：要么仍在 GenStack，要么已被物化管线写入槽（无 PostCallJob 时也可能同步清栈）
		expectVoicemailDiverted(await host.ensureProfile("demo-user"));
	});
});
