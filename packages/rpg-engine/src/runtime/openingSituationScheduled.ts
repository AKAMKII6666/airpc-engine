/**
 * Scheduled-call opening policy. Story-planned calls belong to the card;
 * reminders/referrals remain provider-controlled callbacks.
 */
import type { BeginCallContext } from "../host/types.js";
import type {
	OpeningSituation,
	ResolveOpeningSituationInput,
} from "./openingSituationResolver.js";

const PROVIDER_SCHEDULED_SOURCES = new Set<BeginCallContext["source"]>([
	"schedule_reminder",
	"expert_referral",
	"recurring_schedule",
]);

function cardFirstTurn(): OpeningSituation["firstTurn"] {
	return {
		mode: "normal_llm",
		callerVisibility: "card_controlled",
		allowMemoryBeforeUserSpeaks: true,
		allowInertiaBeforeUserSpeaks: true,
		allowNameBeforeIdentified: true,
		forbidden: [],
	};
}

function providerFirstTurn(): OpeningSituation["firstTurn"] {
	return {
		mode: "normal_llm",
		callerVisibility: "known_or_intended",
		allowMemoryBeforeUserSpeaks: true,
		allowInertiaBeforeUserSpeaks: true,
		allowNameBeforeIdentified: true,
		forbidden: [],
	};
}

function commonTags(input: ResolveOpeningSituationInput): string[] {
	const ctx = input.beginContext;
	if (!ctx) return [];
	return [
		ctx.source,
		ctx.actualEntry ?? input.scene.callDirection,
		ctx.topicHint ? "has_topic" : "no_topic",
	];
}

export function resolveScheduledOpening(
	input: ResolveOpeningSituationInput,
): OpeningSituation | null {
	const ctx = input.beginContext;
	if (!ctx) return null;
	if (ctx.source === "story_scheduled_call" || ctx.source === "scheduled_call") {
		return {
			kind: "card_story",
			priority: 85,
			control: "card",
			reason: "story-planned outbound opening belongs to the current card",
			tags: ["story_scheduled_call", ...commonTags(input)],
			firstTurn: cardFirstTurn(),
		};
	}
	if (!PROVIDER_SCHEDULED_SOURCES.has(ctx.source)) return null;
	return {
		kind: "scheduled_callback",
		priority: 90,
		control: "provider",
		reason: "scheduled or planned callback should carry its topic",
		tags: [
			"scheduled_callback",
			...commonTags(input),
			ctx.isEarlyUserDial ? "early_user_dial" : "on_time_or_outbound",
		],
		firstTurn: providerFirstTurn(),
	};
}
