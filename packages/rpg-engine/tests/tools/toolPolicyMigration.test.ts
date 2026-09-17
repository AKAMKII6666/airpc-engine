import { describe, expect, it } from "vitest";
import {
  normalizeCallCardToolPolicy,
  type CallCardDefinition,
} from "../../src/index.js";

function card(
  patch: Partial<CallCardDefinition> = {},
): CallCardDefinition {
  return {
    cardId: "card",
    cardKind: "story",
    ownerAgentId: "lanxing",
    interactionMode: "realtime_dialogue",
    toolPolicy: { mode: "allowlist", allowedToolIds: ["search_memory"] },
    exits: [],
    ...patch,
  };
}

describe("ToolPolicy v2 migration", function () {
  it("preserves active hangup on legacy realtime allowlists and is idempotent", function () {
    const once = normalizeCallCardToolPolicy(card());
    expect(once.toolPolicy).toMatchObject({
      schemaVersion: 2,
      mode: "allowlist",
      allowedToolIds: ["search_memory", "request_hangup"],
      options: {
        request_hangup: { allowedReasonKinds: ["natural", "policy"] },
      },
    });
    expect(normalizeCallCardToolPolicy(once)).toEqual(once);
  });

  it("does not add hangup to deny_all, playback_only, or voicemail", function () {
    const samples = [
      card({ toolPolicy: { mode: "deny_all" } }),
      card({ interactionMode: "playback_only" }),
      card({ cardKind: "voicemail", interactionMode: "playback_only" }),
    ];
    for (const sample of samples) {
      const normalized = normalizeCallCardToolPolicy(sample);
      expect(normalized.toolPolicy?.allowedToolIds ?? []).not.toContain(
        "request_hangup",
      );
      expect(normalized.toolPolicy?.schemaVersion).toBe(2);
    }
  });

  it("converts studioShellHangup and removes the legacy context field", function () {
    const normalized = normalizeCallCardToolPolicy(card({
      context: {
        studioShellHangup: {
          naturalHangup: true,
          policyHangup: false,
        },
      },
    }));
    expect(normalized.context).not.toHaveProperty("studioShellHangup");
    expect(
      normalized.toolPolicy?.options?.request_hangup?.allowedReasonKinds,
    ).toEqual(["natural"]);
  });
});
