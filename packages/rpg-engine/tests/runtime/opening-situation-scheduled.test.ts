import { describe, expect, it } from "vitest";
import type { BeginCallContext, ComposeScene } from "../../src/host/types.js";
import { resolveOpeningSituation } from "../../src/runtime/openingSituationResolver.js";

function scene(): ComposeScene {
	return {
		callDirection: "outbound",
		localTime: { localHour: 10, timezoneOffsetMinutes: 480 },
	} as ComposeScene;
}

function beginContext(source: BeginCallContext["source"]): BeginCallContext {
	return {
		source,
		actualEntry: "outbound_auto",
		scheduledIntentId: "intent_story",
		topicHint: "chapter_entry_ring",
	};
}

describe("scheduled opening ownership", () => {
	it("keeps story-planned outbound opening under card control", () => {
		const result = resolveOpeningSituation({
			beginContext: beginContext("story_scheduled_call"),
			scene: scene(),
		});

		expect(result).toMatchObject({ kind: "card_story", control: "card" });
		expect(result.tags).toEqual(
			expect.arrayContaining(["story_scheduled_call", "has_topic"]),
		);
	});

	it("keeps user reminders under provider callback control", () => {
		const result = resolveOpeningSituation({
			beginContext: beginContext("schedule_reminder"),
			scene: scene(),
		});

		expect(result).toMatchObject({
			kind: "scheduled_callback",
			control: "provider",
		});
	});
});
