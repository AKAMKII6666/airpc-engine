/**
 * attach_call_card voicemail divert 测步骤。
 */
import { expect } from "vitest";
import {
	listVoicemailGenStack,
	type CallCardDefinition,
	type CallSession,
	type Effect,
	type PlayerProfile,
} from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effect/effectExecutor.js";

export async function assertAttachVoicemailToGenStack(input: {
	profile: PlayerProfile;
	session: CallSession;
	voicemailCard: CallCardDefinition;
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined;
}): Promise<void> {
	const effects: Effect[] = [
		{
			id: "fx_attach_vm",
			effect: "attach_call_card",
			agentId: "lanxing",
			cardId: "lanxing_voicemail",
			chapterId: "wrong_number_act1",
		},
	];
	const plan = await executeEffects(effects, {
		profile: input.profile,
		session: input.session,
		nowIso: "2026-07-23T00:00:00.000Z",
		lookupCard: input.lookupFromMap({
			lanxing_voicemail: input.voicemailCard,
		}),
	});
	expect(plan.results[0]?.status).toBe("executed");
	expect(input.profile.callCards.board.byAgent.lanxing?.pending ?? []).toEqual(
		[],
	);
	const stack = listVoicemailGenStack(input.profile);
	expect(stack).toHaveLength(1);
	expect(stack[0]?.cardId).toBe("lanxing_voicemail");
	expect(stack[0]?.source).toBe("attach");
	expect(stack[0]?.chapterId).toBe("wrong_number_act1");
}

export async function assertAttachStoryStillBoards(input: {
	profile: PlayerProfile;
	session: CallSession;
	storyCard: CallCardDefinition;
	voicemailCard: CallCardDefinition;
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined;
}): Promise<void> {
	const plan = await executeEffects(
		[
			{
				id: "fx_attach_story",
				effect: "attach_call_card",
				agentId: "lanxing",
				cardId: "lanxing_callback_intro",
				chapterId: "wrong_number_act1",
			},
		],
		{
			profile: input.profile,
			session: input.session,
			nowIso: "2026-07-23T00:00:00.000Z",
			lookupCard: input.lookupFromMap({
				lanxing_callback_intro: input.storyCard,
				lanxing_voicemail: input.voicemailCard,
			}),
		},
	);
	expect(plan.results[0]?.status).toBe("executed");
	expect(listVoicemailGenStack(input.profile)).toHaveLength(0);
	expect(input.profile.callCards.board.byAgent.lanxing?.pending).toHaveLength(
		1,
	);
	expect(
		input.profile.callCards.board.byAgent.lanxing?.pending[0]?.cardId,
	).toBe("lanxing_callback_intro");
}

export async function assertAttachBlindStillBoards(input: {
	profile: PlayerProfile;
	session: CallSession;
}): Promise<void> {
	await executeEffects(
		[
			{
				id: "fx_attach_blind",
				effect: "attach_call_card",
				agentId: "lanxing",
				cardId: "lanxing_voicemail",
				chapterId: "wrong_number_act1",
			},
		],
		{
			profile: input.profile,
			session: input.session,
			nowIso: "2026-07-23T00:00:00.000Z",
		},
	);
	expect(listVoicemailGenStack(input.profile)).toHaveLength(0);
	expect(input.profile.callCards.board.byAgent.lanxing?.pending).toHaveLength(
		1,
	);
}
