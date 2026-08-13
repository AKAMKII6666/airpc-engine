/**
 * Opening Situation Resolver：只锁电话事实分类，不生成 opening 文案。
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  resolveOpeningSituation,
  type BeginCallContext,
} from "../../src/index.js";

function scene(input: {
  actualEntry?: "inbound_user_dial" | "outbound_auto";
  localNowIso?: string;
}) {
  return buildComposeScene({
    entryMode: "either",
    actualEntry: input.actualEntry,
    localNowIso: input.localNowIso ?? "2026-08-12T18:00:00+08:00",
  });
}

function beginContext(
  patch: Partial<BeginCallContext> = {},
): BeginCallContext {
  return {
    source: "free",
    actualEntry: "inbound_user_dial",
    ...patch,
  };
}

describe("resolveOpeningSituation", function () {
	  it("classifies normal evening player inbound as temporal unknown caller", function () {
	    const result = resolveOpeningSituation({
	      beginContext: beginContext(),
	      scene: scene({ actualEntry: "inbound_user_dial" }),
	    });
	    expect(result).toMatchObject({
	      kind: "evening_inbound",
	      control: "provider",
	      firstTurn: {
	        mode: "direct_opening",
	        callerVisibility: "unknown",
	        allowMemoryBeforeUserSpeaks: false,
	        allowInertiaBeforeUserSpeaks: false,
	        allowNameBeforeIdentified: false,
	      },
	    });
	    expect(result.tags).toEqual(
	      expect.arrayContaining(["inbound", "temporal", "evening", "unknown_caller"]),
	    );
	  });

  it("classifies npc outbound as outbound generic", function () {
    const result = resolveOpeningSituation({
      beginContext: beginContext({
        actualEntry: "outbound_auto",
      }),
      scene: scene({ actualEntry: "outbound_auto" }),
    });
    expect(result).toMatchObject({
      kind: "outbound_generic",
      control: "provider",
    });
    expect(result.tags).toContain("outbound");
    expect(result.firstTurn).toMatchObject({
      mode: "normal_llm",
      callerVisibility: "known_or_intended",
      allowMemoryBeforeUserSpeaks: true,
      allowInertiaBeforeUserSpeaks: true,
    });
  });

  it("classifies late-night player inbound above generic inbound", function () {
    const result = resolveOpeningSituation({
      beginContext: beginContext(),
      scene: scene({
        actualEntry: "inbound_user_dial",
        localNowIso: "2026-08-12T02:30:00+08:00",
      }),
    });
    expect(result).toMatchObject({
      kind: "late_night_inbound",
      control: "provider",
    });
    expect(result.priority).toBeGreaterThan(60);
    expect(result.tags).toContain("late_night");
  });

	  it("classifies night player inbound separately from late night", function () {
	    const result = resolveOpeningSituation({
      beginContext: beginContext(),
      scene: scene({
        actualEntry: "inbound_user_dial",
        localNowIso: "2026-08-12T23:10:00+08:00",
      }),
    });
    expect(result).toMatchObject({
      kind: "night_inbound",
      control: "provider",
    });
	    expect(result.tags).toContain("night");
	  });

	  it("classifies daytime inbound by temporal bucket without falling back to generic unknown", function () {
	    const morning = resolveOpeningSituation({
	      beginContext: beginContext(),
	      scene: scene({
	        actualEntry: "inbound_user_dial",
	        localNowIso: "2026-08-12T09:10:00+08:00",
	      }),
	    });
	    const afternoon = resolveOpeningSituation({
	      beginContext: beginContext(),
	      scene: scene({
	        actualEntry: "inbound_user_dial",
	        localNowIso: "2026-08-12T15:30:00+08:00",
	      }),
	    });

	    expect(morning).toMatchObject({
	      kind: "morning_inbound",
	      control: "provider",
	    });
	    expect(morning.tags).toEqual(
	      expect.arrayContaining(["temporal", "morning", "unknown_caller"]),
	    );
	    expect(afternoon).toMatchObject({
	      kind: "afternoon_inbound",
	      control: "provider",
	    });
	    expect(afternoon.tags).toEqual(
	      expect.arrayContaining(["temporal", "afternoon", "unknown_caller"]),
	    );
	  });

  it("keeps scheduled callbacks above inbound unknown, including early user dial", function () {
    const result = resolveOpeningSituation({
      beginContext: beginContext({
        source: "schedule_reminder",
        scheduledIntentId: "intent_1",
        topicHint: "提醒带伞",
        isEarlyUserDial: true,
      }),
      scene: scene({ actualEntry: "inbound_user_dial" }),
    });
    expect(result).toMatchObject({
      kind: "scheduled_callback",
      control: "provider",
    });
    expect(result.priority).toBeGreaterThan(70);
    expect(result.tags).toEqual(
      expect.arrayContaining(["schedule_reminder", "has_topic", "early_user_dial"]),
    );
  });

  it("keeps missed outbound resume above inbound unknown", function () {
    const result = resolveOpeningSituation({
      beginContext: beginContext({
        isMissedOutbound: true,
        missedOutbound: {
          at: "2026-08-12T10:00:00.000Z",
          reason: "dismissed",
        },
      }),
      scene: scene({ actualEntry: "inbound_user_dial" }),
    });
    expect(result).toMatchObject({
      kind: "missed_outbound_resume",
      control: "provider",
    });
    expect(result.priority).toBeGreaterThan(90);
  });

  it("leaves story and simulate openings to the card", function () {
    const story = resolveOpeningSituation({
      beginContext: beginContext({
        source: "story",
        actualEntry: "outbound_auto",
      }),
      scene: scene({ actualEntry: "outbound_auto" }),
    });
    expect(story).toMatchObject({
      kind: "card_story",
      control: "card",
    });

    const simulate = resolveOpeningSituation({
      beginContext: beginContext({
        source: "simulate",
        actualEntry: "outbound_auto",
      }),
      scene: scene({ actualEntry: "outbound_auto" }),
    });
    expect(simulate).toMatchObject({
      kind: "card_story",
      control: "card",
    });
  });

  it("leaves mailbox openings to playback card", function () {
    const result = resolveOpeningSituation({
      beginContext: beginContext({ source: "mailbox" }),
      scene: scene({ actualEntry: "inbound_user_dial" }),
    });
    expect(result).toMatchObject({
      kind: "mailbox_playback",
      control: "card",
    });
  });
});
