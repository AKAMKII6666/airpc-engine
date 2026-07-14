/**
 * 模块名称：ExitSelector 单测
 */
import { describe, expect, it } from "vitest";
import { CallCardDefinitionSchema } from "../../src/index.js";
import { selectExit } from "../../src/runtime/exitSelector.js";

const card = CallCardDefinitionSchema.parse({
  cardId: "t",
  ownerAgentId: "a",
  objectives: { requiredBeats: ["b1"] },
  exits: [
    {
      exitId: "win",
      priority: 100,
      condition: {
        op: "and",
        items: [
          { op: "outcome_flag", flag: "answered_completed", equals: true },
          { op: "beat_completed", beatId: "b1" },
        ],
      },
      effects: [],
    },
    {
      exitId: "fail",
      priority: 10,
      condition: { op: "outcome_flag", flag: "hangup_early", equals: true },
      effects: [],
    },
  ],
});

describe("selectExit", () => {
  it("picks higher priority success", () => {
    const selected = selectExit(card, {
      flags: { answered_completed: true },
      completedBeats: ["b1"],
      missedRequiredBeats: [],
    });
    expect(selected?.exit.exitId).toBe("win");
  });

  it("returns null when nothing matches", () => {
    const selected = selectExit(card, {
      flags: {},
      completedBeats: [],
      missedRequiredBeats: ["b1"],
    });
    expect(selected).toBeNull();
  });

  it("same priority: static beats dynamic", () => {
    const selected = selectExit(
      card,
      {
        flags: { answered_completed: true },
        completedBeats: ["b1"],
        missedRequiredBeats: [],
      },
      [
        {
          candidateId: "c1",
          toolId: "share_expert_number",
          registeredAt: "2026-01-01T00:00:00.000Z",
          priority: 100,
          effects: [
            {
              id: "e1",
              effect: "set_character_unlocked",
              args: { agentId: "x" },
            },
          ],
        },
      ],
    );
    expect(selected?.source).toBe("static");
    expect(selected?.exit.exitId).toBe("win");
  });
});
