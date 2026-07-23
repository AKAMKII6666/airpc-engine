/**
 * S8-1：collectReferencedAgentIds + participants 可选 schema
 */
import { describe, expect, it } from "vitest";
import {
  collectReferencedAgentIds,
  StoryPackageConfSchema,
  type CallCardDefinition,
} from "../../src/index.js";

function card(
  partial: Partial<CallCardDefinition> & {
    cardId: string;
    ownerAgentId: string;
  },
): CallCardDefinition {
  return {
    cardKind: "story",
    exits: [],
    ...partial,
  };
}

describe("collectReferencedAgentIds ownerAgentId (S8-1)", () => {
  it("collects ownerAgentId from cards", () => {
    const ids = collectReferencedAgentIds({
      conf: { schemaVersion: 1, packageId: "pkg", cards: [] },
      cards: [
        card({ cardId: "c1", ownerAgentId: "lanxing" }),
        card({ cardId: "c2", ownerAgentId: "xiaopi" }),
      ],
    });
    expect([...ids].sort()).toEqual(["lanxing", "xiaopi"]);
  });
});

describe("collectReferencedAgentIds effects (S8-1)", () => {
  it("collects agentId from attach_call_card effect", () => {
    const ids = collectReferencedAgentIds({
      conf: { schemaVersion: 1, packageId: "pkg", cards: [] },
      cards: [
        card({
          cardId: "c1",
          ownerAgentId: "owner_a",
          exits: [
            {
              exitId: "exit_ok",
              condition: { op: "always" },
              effects: [
                {
                  id: "e_attach",
                  effect: "attach_call_card",
                  agentId: "target_b",
                  cardId: "free_b",
                },
              ],
            },
          ],
        }),
      ],
    });
    expect([...ids].sort()).toEqual(["owner_a", "target_b"]);
  });

  it("collects end_story.next.agentId", () => {
    const ids = collectReferencedAgentIds({
      conf: { schemaVersion: 1, packageId: "pkg", cards: [] },
      cards: [
        card({
          cardId: "c1",
          ownerAgentId: "owner_a",
          exits: [
            {
              exitId: "exit_end",
              condition: { op: "always" },
              effects: [
                {
                  id: "e_end",
                  effect: "end_story",
                  next: {
                    packageId: "ch2",
                    agentId: "entry_agent",
                    cardId: "ch2_start",
                  },
                },
              ],
            },
          ],
        }),
      ],
    });
    expect([...ids].sort()).toEqual(["entry_agent", "owner_a"]);
  });

  it("deduplicates repeated agentId", () => {
    const ids = collectReferencedAgentIds({
      conf: { schemaVersion: 1, packageId: "pkg", cards: [] },
      cards: [
        card({
          cardId: "c1",
          ownerAgentId: "same",
          exits: [
            {
              exitId: "e1",
              condition: { op: "always" },
              effects: [
                {
                  id: "unlock",
                  effect: "set_character_unlocked",
                  agentId: "same",
                },
              ],
            },
          ],
        }),
      ],
    });
    expect(ids.size).toBe(1);
    expect(ids.has("same")).toBe(true);
  });
});

describe("StoryPackageConfSchema participants (S8-1)", () => {
  it("accepts missing participants and defaults to []", () => {
    const parsed = StoryPackageConfSchema.safeParse({
      schemaVersion: 1,
      packageId: "new_pkg",
      cards: [],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.participants).toEqual([]);
  });
});
