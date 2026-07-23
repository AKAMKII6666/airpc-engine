/**
 * 语音留言物化单测共用夹具（V2-VM-6 / V2-VM-7）
 */
import {
	PlayerProfileSchema,
	type CallCardDefinition,
} from "../../src/index.js";

export function baseProfile() {
	const profile = PlayerProfileSchema.parse({
		schemaVersion: 1,
		userId: "u1",
		user: {
			userId: "u1",
			nickname: "测",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
	});
	profile.callCards = { board: { byAgent: {} } };
	profile.schedule = { clockMs: 0, intents: [] };
	profile.telephony = undefined;
	return profile;
}

export const voicemailCard: CallCardDefinition = {
	cardId: "lanxing_voicemail",
	cardKind: "voicemail",
	ownerAgentId: "lanxing",
	entryMode: "mailbox_open",
	interactionMode: "playback_only",
	toolPolicy: { mode: "deny_all" },
	context: {
		speakableBrief: "喂，是你吗？",
		objective: "留下回电钩子",
		privateBrief: "勿泄露下一幕",
	},
	exits: [],
};

export const clipCard: CallCardDefinition = {
	...voicemailCard,
	cardId: "lanxing_voicemail_clip",
	context: {
		playbackClipId: "clip_vm_ready",
		speakableBrief: "成品片旁白",
	},
};

export function lookupFromMap(
	cards: Record<string, CallCardDefinition>,
): (packageId: string, cardId: string) => CallCardDefinition | undefined {
	return function (_packageId, cardId) {
		return cards[cardId];
	};
}
