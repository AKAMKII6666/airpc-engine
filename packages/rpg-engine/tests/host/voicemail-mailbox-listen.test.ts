/**
 * V2-VM-11 / FR-1–2：mailbox_open 听完路径
 * - resolve(mailbox_open) 绑 voicemail 卡，不从 Board
 * - Outcome 听完 → 槽 status=listened + 未读回调 true→false
 * - 负向：脏 Board 上的 voicemail 不得经 user_dial 接通
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
	deriveVoicemailHasUnread,
	isEngineError,
} from "../../src/index.js";
import { createRecordingUnreadNotifier } from "../../src/runtime/voicemail/voicemailPorts.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function copyDataRoot(): Promise<string> {
	const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-vm-listen-"));
	const dataRoot = path.join(tmpRoot, "data");
	await cp(dataSrc, dataRoot, { recursive: true });
	return tmpRoot;
}

async function seedUnreadVoicemail(
	host: ReturnType<typeof createTestHost>,
): Promise<void> {
	const profile = await host.ensureProfile("demo-user");
	if (!profile.telephony) profile.telephony = {};
	profile.telephony.voicemails = [
		{
			id: "vm_lanxing_1",
			agentId: "lanxing",
			cardId: "lanxing_voicemail",
			packageId: "wrong_number_act1",
			text: "喂？是我，澜星。",
			status: "unread",
			createdAt: new Date().toISOString(),
		},
	];
}

describe("voicemail mailbox_open listen path", () => {
	let tmpRoot: string | undefined;

	afterEach(async () => {
		if (tmpRoot) {
			await rm(tmpRoot, { recursive: true, force: true });
			tmpRoot = undefined;
		}
	});

	it("mailbox_open → exits + slot listened + unread false", async () => {
		tmpRoot = await copyDataRoot();
		const dataRoot = path.join(tmpRoot, "data");
		const unreadNotify = createRecordingUnreadNotifier();
		const host = createTestHost({
			persist: false,
			dataRoot,
			onVoicemailUnreadChanged: unreadNotify,
		});
		await host.loadWorkspace(dataRoot, { resetRuntime: true });
		await seedUnreadVoicemail(host);
		expect(
			deriveVoicemailHasUnread(
				(await host.ensureProfile("demo-user")).telephony,
			),
		).toBe(true);
		unreadNotify.calls.length = 0;

		const resolved = await host.resolveAsync("demo-user", {
			kind: "mailbox_open",
			agentId: "lanxing",
			voicemailId: "vm_lanxing_1",
			cardId: "lanxing_voicemail",
		});
		if (isEngineError(resolved)) throw resolved;
		expect(resolved.source).toBe("mailbox");
		expect(resolved.card.cardKind).toBe("voicemail");
		expect(resolved.card.entryMode).toBe("mailbox_open");

		const session = await host.beginCall("demo-user", resolved, {
			channel: "manual",
		});
		if (isEngineError(session)) throw session;
		expect(session.frozenCard.entryMode).toBe("mailbox_open");
		host.completePlayback(session.sessionId);

		const end = await host.endCall(session.sessionId, {
			flags: {
				answered_completed: true,
				playback_completed: true,
				voicemail_listened: true,
			},
			completedBeats: [],
			missedRequiredBeats: [],
		});
		if (isEngineError(end)) throw end;
		expect(end.selectedExitId).toBe("exit_end");

		const after = await host.ensureProfile("demo-user");
		expect(after.telephony?.redialSlot?.cardId).toBe(
			"lanxing_callback_intro",
		);
		expect(
			after.telephony?.voicemails?.find(function (item) {
				return item.id === "vm_lanxing_1";
			})?.status,
		).toBe("listened");
		expect(deriveVoicemailHasUnread(after.telephony)).toBe(false);
		expect(unreadNotify.calls).toContain(false);
	});

	it("user_dial 不得接通 Board 上的 voicemail", async () => {
		tmpRoot = await copyDataRoot();
		const dataRoot = path.join(tmpRoot, "data");
		const host = createTestHost({ persist: false, dataRoot });
		await host.loadWorkspace(dataRoot, { resetRuntime: true });
		await host.preloadCard("wrong_number_act1", "lanxing_voicemail");
		const profile = await host.ensureProfile("demo-user");
		profile.callCards.board.byAgent.lanxing = {
			pending: [
				{
					instanceId: "inst_vm_corrupt",
					packageId: "wrong_number_act1",
					cardId: "lanxing_voicemail",
					agentId: "lanxing",
					status: "pending",
					entryMode: "either",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		};

		const resolved = host.resolve("demo-user", {
			kind: "user_dial",
			agentId: "lanxing",
		});
		expect(isEngineError(resolved)).toBe(true);
		if (!isEngineError(resolved)) return;
		expect(resolved.code).toBe("VALIDATION_FAILED");
		expect(String(resolved.message)).toMatch(/voicemail/i);
	});
});
