/**
 * persona.personalityCode → Composer systemHard 人格扮演块。
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  buildPersonalityHardBlock,
  composeRenderedPrompt,
  normalizePersonalityCode,
  type CallCardDefinition,
  type CharacterDef,
} from "../../src/index.js";

function baseCard(): CallCardDefinition {
  return {
    cardId: "t1",
    cardKind: "story",
    ownerAgentId: "agent-a",
    entryMode: "outbound_auto",
    context: { objective: "闲聊", speakableBrief: "嗨。" },
    exits: [],
  };
}

describe("normalizePersonalityCode", () => {
  it("uppercases known MBTI codes", () => {
    expect(normalizePersonalityCode("enfp")).toBe("ENFP");
    expect(normalizePersonalityCode("  Intj ")).toBe("INTJ");
  });

  it("returns null for blank and keeps custom codes trimmed", () => {
    expect(normalizePersonalityCode("   ")).toBeNull();
    expect(normalizePersonalityCode("  custom-warm  ")).toBe("custom-warm");
  });
});

describe("composeRenderedPrompt personalityCode", () => {
  it("injects personality roleplay block into systemHard", () => {
    const character: CharacterDef = {
      schemaVersion: 1,
      agentId: "agent-a",
      dialable: true,
      persona: {
        systemPrompt: "你是澜星姐姐。",
        personalityCode: "enfp",
      },
    };
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T12:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({
      card: baseCard(),
      characterDef: character,
      scene,
    });
    expect(prompt && "ok" in prompt && prompt.ok === false).toBe(false);
    if (prompt && "ok" in prompt && prompt.ok === false) return;

    const personalityBlock = prompt.systemHard.find((s) =>
      s.includes("[persona.personality]"),
    );
    expect(personalityBlock).toBe(buildPersonalityHardBlock("ENFP"));
    expect(
      prompt.systemHard.some((s) => s.includes("persona.systemPrompt")),
    ).toBe(true);
  });

  it("skips empty personalityCode", () => {
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T12:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({
      card: baseCard(),
      characterDef: {
        schemaVersion: 1,
        agentId: "a",
        dialable: true,
        persona: { personalityCode: "   " },
      },
      scene,
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(
      prompt.systemHard.some((s) => s.includes("[persona.personality]")),
    ).toBe(false);
  });
});
