/**
 * voicemail materialize 测步骤。
 */
import { expect } from "vitest";
import {
	createRecordingGenerateVoicemail,
	createRecordingUnreadNotifier,
	deriveVoicemailHasUnread,
	listVoicemailGenStack,
	pushVoicemailGenStack,
	runVoicemailMaterializePipeline,
	type CallCardDefinition,
	type PlayerProfile,
} from "../../src/index.js";

export async function assertMaterializeUnreadAndFailed(
	profile: PlayerProfile,
	voicemailCard: CallCardDefinition,
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined,
): Promise<void> {
	pushVoicemailGenStack(profile, {
		id: "fx_ok",
		agentId: "lanxing",
		cardId: "lanxing_voicemail",
		chapterId: "pkg",
		source: "attach",
		createdAt: "2026-07-23T00:00:00.000Z",
	});
	pushVoicemailGenStack(profile, {
		id: "fx_boom",
		agentId: "lanxing",
		cardId: "missing_card",
		chapterId: "pkg",
		source: "attach",
		createdAt: "2026-07-23T00:00:01.000Z",
	});
	const generate = createRecordingGenerateVoicemail({
		text: "生成留言正文",
	});
	const notify = createRecordingUnreadNotifier();
	const result = await runVoicemailMaterializePipeline({
		profile,
		nowIso: "2026-07-23T00:01:00.000Z",
		lookupCard: lookupFromMap({ lanxing_voicemail: voicemailCard }),
		generateVoicemail: generate,
		onVoicemailUnreadChanged: notify,
	});
	expect(listVoicemailGenStack(profile)).toHaveLength(0);
	expect(profile.callCards.board.byAgent).toEqual({});
	expect(result.results).toHaveLength(2);
	expect(result.results[0]?.status).toBe("materialized");
	expect(result.results[1]?.status).toBe("skipped_no_card");
	const slots = profile.telephony?.voicemails ?? [];
	expect(slots).toHaveLength(2);
	expect(slots[0]?.status).toBe("unread");
	expect(slots[0]?.text).toBe("生成留言正文");
	expect(slots[1]?.status).toBe("generate_failed");
	expect(result.hasUnread).toBe(true);
	expect(deriveVoicemailHasUnread(profile.telephony)).toBe(true);
	expect(notify.calls).toEqual([true]);
	expect(generate.calls).toHaveLength(1);
	expect(generate.calls[0]?.assembledPrompt).toContain("speakable:");
}

export async function assertMaterializeClipSkipsLlm(
	profile: PlayerProfile,
	clipCard: CallCardDefinition,
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined,
): Promise<void> {
	pushVoicemailGenStack(profile, {
		id: "fx_clip",
		agentId: "lanxing",
		cardId: "lanxing_voicemail_clip",
		chapterId: "pkg",
		source: "schedule",
		createdAt: "2026-07-23T00:00:00.000Z",
	});
	const generate = createRecordingGenerateVoicemail({ text: "不应调用" });
	const result = await runVoicemailMaterializePipeline({
		profile,
		nowIso: "2026-07-23T00:01:00.000Z",
		lookupCard: lookupFromMap({
			lanxing_voicemail_clip: clipCard,
		}),
		generateVoicemail: generate,
	});
	expect(result.results[0]?.status).toBe("materialized");
	expect(generate.calls).toHaveLength(0);
	expect(profile.telephony?.voicemails?.[0]?.audioRef).toBe("clip_vm_ready");
	expect(profile.telephony?.voicemails?.[0]?.status).toBe("unread");
}

export async function assertMaterializeWithoutGeneratePort(
	profile: PlayerProfile,
	voicemailCard: CallCardDefinition,
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined,
): Promise<void> {
	pushVoicemailGenStack(profile, {
		id: "fx_no_port",
		agentId: "lanxing",
		cardId: "lanxing_voicemail",
		chapterId: "pkg",
		source: "attach",
		createdAt: "2026-07-23T00:00:00.000Z",
	});
	const result = await runVoicemailMaterializePipeline({
		profile,
		nowIso: "2026-07-23T00:01:00.000Z",
		lookupCard: lookupFromMap({ lanxing_voicemail: voicemailCard }),
		generateVoicemail: null,
	});
	expect(result.results[0]?.status).toBe("generate_failed");
	expect(result.results[0]?.error).toMatch(/not injected/);
	expect(profile.telephony?.voicemails?.[0]?.status).toBe("generate_failed");
	expect(result.hasUnread).toBe(false);
}
