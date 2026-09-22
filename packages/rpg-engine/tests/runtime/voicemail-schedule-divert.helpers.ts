/**
 * schedule_call_card voicemail divert 测步骤。
 */
import { expect } from "vitest";
import {
	advanceProfileClock,
	listVoicemailGenStack,
	type CallCardDefinition,
	type CallSession,
	type Effect,
	type PlayerProfile,
} from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effect/effectExecutor.js";

export async function assertScheduleVoicemailToGenStack(input: {
	profile: PlayerProfile;
	session: CallSession;
	voicemailCard: CallCardDefinition;
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined;
}): Promise<void> {
	const lookup = input.lookupFromMap({
		lanxing_voicemail: input.voicemailCard,
	});
	const effects: Effect[] = [
		{
			id: "fx_sched_vm",
			effect: "schedule_call_card",
			agentId: "lanxing",
			cardId: "lanxing_voicemail",
			chapterId: "wrong_number_act1",
			delayMinutes: 5,
		},
	];
	const plan = await executeEffects(effects, {
		profile: input.profile,
		session: input.session,
		nowIso: "2026-07-23T00:00:00.000Z",
		lookupCard: lookup,
	});
	expect(plan.results[0]?.status).toBe("executed");
	expect(input.profile.callCards.board.byAgent.lanxing?.pending ?? []).toEqual(
		[],
	);
	expect(listVoicemailGenStack(input.profile)).toHaveLength(0);

	const intents = input.profile.schedule?.intents ?? [];
	expect(intents).toHaveLength(1);
	const once = intents[0] as {
		delivery?: string;
		linkedInstanceId?: string;
		status: string;
	};
	expect(once.delivery).toBe("voicemail_mailbox");
	expect(once.linkedInstanceId).toBeUndefined();
	expect(once.status).toBe("pending");

	const fired = advanceProfileClock(
		input.profile,
		5 * 60_000,
		"2026-07-23T00:05:00.000Z",
		lookup,
	);
	expect(fired).toEqual([]);
	expect(input.profile.callCards.board.byAgent.lanxing?.pending ?? []).toEqual(
		[],
	);
	const stack = listVoicemailGenStack(input.profile);
	expect(stack).toHaveLength(1);
	expect(stack[0]?.source).toBe("schedule");
	expect(stack[0]?.cardId).toBe("lanxing_voicemail");
	const after = input.profile.schedule?.intents[0] as { status: string };
	expect(after.status).toBe("fired");
}

export async function assertScheduleStoryStillFires(input: {
	profile: PlayerProfile;
	session: CallSession;
	storyCard: CallCardDefinition;
	lookupFromMap: (
		cards: Record<string, CallCardDefinition>,
	) => (chapterId: string, cardId: string) => CallCardDefinition | undefined;
}): Promise<void> {
	const lookup = input.lookupFromMap({ story_callback: input.storyCard });
	await executeEffects(
		[
			{
				id: "fx_sched_story",
				effect: "schedule_call_card",
				agentId: "lanxing",
				cardId: "story_callback",
				chapterId: "wrong_number_act1",
				delayMinutes: 5,
			},
		],
		{
			profile: input.profile,
			session: input.session,
			nowIso: "2026-07-23T00:00:00.000Z",
			lookupCard: lookup,
		},
	);
	expect(input.profile.callCards.board.byAgent.lanxing?.pending).toHaveLength(
		1,
	);
	const fired = advanceProfileClock(
		input.profile,
		5 * 60_000,
		"2026-07-23T12:00:00.000Z",
		lookup,
	);
	expect(fired.some((f) => f.cardId === "story_callback")).toBe(true);
	expect(listVoicemailGenStack(input.profile)).toHaveLength(0);
}
