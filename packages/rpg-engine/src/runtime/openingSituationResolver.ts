/**
 * Opening Situation Resolver：只判断电话开场事实，不生成文案。
 */
import type { BeginCallContext, ComposeScene } from "../host/types.js";

export type OpeningSituationKind =
  | "missed_outbound_resume"
  | "scheduled_callback"
  | "card_story"
  | "late_night_inbound"
  | "night_inbound"
  | "early_morning_inbound"
  | "morning_inbound"
  | "noon_inbound"
  | "afternoon_inbound"
  | "evening_inbound"
  | "inbound_unknown"
  | "outbound_generic"
  | "mailbox_playback"
  | "unknown";

export type OpeningControl = "card" | "provider";

export interface OpeningSituation {
  kind: OpeningSituationKind;
  /** 数字越大，后续 Opening Provider 越应优先采纳。 */
  priority: number;
  control: OpeningControl;
  reason: string;
  tags: string[];
  firstTurn: {
    mode: "direct_opening" | "opening_llm_sanitized" | "normal_llm";
    callerVisibility:
      | "unknown"
      | "known_or_intended"
      | "card_controlled"
      | "unknown_state";
    allowMemoryBeforeUserSpeaks: boolean;
    allowInertiaBeforeUserSpeaks: boolean;
    allowNameBeforeIdentified: boolean;
    forbidden: string[];
  };
}

export interface ResolveOpeningSituationInput {
  beginContext?: BeginCallContext;
  scene: ComposeScene;
}

const SCHEDULED_SOURCES = new Set<BeginCallContext["source"]>([
  "schedule_reminder",
  "expert_referral",
  "story_scheduled_call",
  "recurring_schedule",
  "scheduled_call",
]);

function isInbound(input: ResolveOpeningSituationInput): boolean {
  if (input.beginContext?.actualEntry) {
    return input.beginContext.actualEntry === "inbound_user_dial";
  }
  return input.scene.callDirection === "inbound";
}

function isOutbound(input: ResolveOpeningSituationInput): boolean {
  if (input.beginContext?.actualEntry) {
    return input.beginContext.actualEntry === "outbound_auto";
  }
  return input.scene.callDirection === "outbound";
}

function localHour(input: ResolveOpeningSituationInput): number {
  return input.scene.localTime.localHour;
}

function temporalTags(
  direction: "inbound" | "outbound",
  bucket: string,
): string[] {
  return [direction, "temporal", bucket];
}

function situation(input: OpeningSituation): OpeningSituation {
  return input;
}

function unknownInboundFirstTurn(): OpeningSituation["firstTurn"] {
  return {
    mode: "direct_opening",
    callerVisibility: "unknown",
    allowMemoryBeforeUserSpeaks: false,
    allowInertiaBeforeUserSpeaks: false,
    allowNameBeforeIdentified: false,
    forbidden: [
      "叫用户名字",
      "提上次通话",
      "提记忆/约定/剧情任务",
      "说已经听出对方是谁",
    ],
  };
}

function knownOrIntendedFirstTurn(): OpeningSituation["firstTurn"] {
  return {
    mode: "normal_llm",
    callerVisibility: "known_or_intended",
    allowMemoryBeforeUserSpeaks: true,
    allowInertiaBeforeUserSpeaks: true,
    allowNameBeforeIdentified: true,
    forbidden: [],
  };
}

function cardControlledFirstTurn(): OpeningSituation["firstTurn"] {
  return {
    mode: "normal_llm",
    callerVisibility: "card_controlled",
    allowMemoryBeforeUserSpeaks: true,
    allowInertiaBeforeUserSpeaks: true,
    allowNameBeforeIdentified: true,
    forbidden: [],
  };
}

export function resolveOpeningSituation(
  input: ResolveOpeningSituationInput,
): OpeningSituation {
  const ctx = input.beginContext;
  const hour = localHour(input);

  if (ctx?.source === "mailbox") {
    return situation({
      kind: "mailbox_playback",
      priority: 100,
      control: "card",
      reason: "mailbox opening belongs to voicemail/playback card",
      tags: ["mailbox", "playback"],
      firstTurn: cardControlledFirstTurn(),
    });
  }

  if (ctx?.isMissedOutbound || ctx?.missedOutbound) {
    return situation({
      kind: "missed_outbound_resume",
      priority: 95,
      control: "provider",
      reason: "user is returning a missed outbound call",
      tags: ["missed_outbound", ctx.actualEntry ?? input.scene.callDirection],
      firstTurn: knownOrIntendedFirstTurn(),
    });
  }

  if (ctx && SCHEDULED_SOURCES.has(ctx.source)) {
    return situation({
      kind: "scheduled_callback",
      priority: 90,
      control: "provider",
      reason: "scheduled or planned callback should carry its topic",
      tags: [
        "scheduled_callback",
        ctx.source,
        ctx.actualEntry ?? input.scene.callDirection,
        ctx.topicHint ? "has_topic" : "no_topic",
        ctx.isEarlyUserDial ? "early_user_dial" : "on_time_or_outbound",
      ],
      firstTurn: knownOrIntendedFirstTurn(),
    });
  }

  if (ctx?.source === "story" || ctx?.source === "simulate") {
    return situation({
      kind: "card_story",
      priority: 80,
      control: "card",
      reason: "story/simulate opening should be owned by the current card",
      tags: [ctx.source, ctx.actualEntry ?? input.scene.callDirection],
      firstTurn: cardControlledFirstTurn(),
    });
  }

	  if (isInbound(input)) {
	    if (hour >= 0 && hour < 5) {
	      return situation({
	        kind: "late_night_inbound",
	        priority: 70,
	        control: "provider",
	        reason: "user dialed in during late night; opening should sound disturbed or sleepy",
	        tags: [...temporalTags("inbound", "late_night"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
	    if (hour >= 5 && hour < 8) {
	      return situation({
	        kind: "early_morning_inbound",
	        priority: 68,
	        control: "provider",
	        reason: "user dialed in early in the morning; opening may lightly acknowledge the early hour",
	        tags: [...temporalTags("inbound", "early_morning"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
	    if (hour >= 8 && hour < 12) {
	      return situation({
	        kind: "morning_inbound",
	        priority: 62,
	        control: "provider",
	        reason: "user dialed in during the morning; opening should stay like a normal answered call",
	        tags: [...temporalTags("inbound", "morning"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
	    if (hour >= 12 && hour < 14) {
	      return situation({
	        kind: "noon_inbound",
	        priority: 62,
	        control: "provider",
	        reason: "user dialed in around noon; opening should stay short and not overplay the time",
	        tags: [...temporalTags("inbound", "noon"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
	    if (hour >= 14 && hour < 18) {
	      return situation({
	        kind: "afternoon_inbound",
	        priority: 62,
	        control: "provider",
	        reason: "user dialed in during the afternoon; opening should stay like a normal answered call",
	        tags: [...temporalTags("inbound", "afternoon"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
	    if (hour >= 18 && hour < 22) {
	      return situation({
	        kind: "evening_inbound",
	        priority: 62,
	        control: "provider",
	        reason: "user dialed in during the evening; opening should stay short and natural",
	        tags: [...temporalTags("inbound", "evening"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
	    if (hour >= 22 && hour < 24) {
	      return situation({
	        kind: "night_inbound",
	        priority: 65,
	        control: "provider",
	        reason: "user dialed in at night; opening should acknowledge the late hour lightly",
	        tags: [...temporalTags("inbound", "night"), "unknown_caller"],
	        firstTurn: unknownInboundFirstTurn(),
	      });
	    }
    return situation({
      kind: "inbound_unknown",
      priority: 60,
      control: "provider",
      reason: "user dialed in and caller is not identified before the first utterance",
      tags: ["inbound", "unknown_caller"],
      firstTurn: unknownInboundFirstTurn(),
    });
  }

  if (isOutbound(input)) {
    return situation({
      kind: "outbound_generic",
      priority: 40,
      control: "provider",
      reason: "npc is calling out and should not use passive unknown-caller opening",
      tags: ["outbound"],
      firstTurn: knownOrIntendedFirstTurn(),
    });
  }

  return situation({
    kind: "unknown",
    priority: 0,
    control: "card",
    reason: "no specific opening situation matched",
    tags: [],
    firstTurn: cardControlledFirstTurn(),
  });
}
