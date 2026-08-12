/**
 * persona.personalityCode → Composer systemHard 人格扮演块。
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  buildPersonaStyleHardBlock,
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

describe("composeRenderedPrompt persona style", () => {
  it("injects character-level speaking style as a provider block", () => {
    const character: CharacterDef = {
      schemaVersion: 1,
      agentId: "lanxing",
      dialable: true,
      persona: {
        systemPrompt: "你是澜星姐姐。",
        personalityCode: "ENFJ",
        profession: "电话朋友 / 角色连接者",
        speakingStyle: "温柔但不软弱；口语化、不慌张",
        voiceNotes: "偏软、带笑意",
        exampleLines: [
          "我叫澜星，你可以叫我澜星姐姐。",
          "这个我不太懂，不过我知道谁可能懂。",
        ],
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
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    const styleBlock = prompt.systemHard.find((block) =>
      block.includes("[persona.style]"),
    );
    expect(styleBlock).toBe(buildPersonaStyleHardBlock(character.persona));
    expect(styleBlock).toContain("角色级说话风格");
    expect(styleBlock).toContain("温柔但不软弱");
    expect(styleBlock).toContain("偏软、带笑意");
    expect(styleBlock).toContain("只学节奏和口吻，不要机械复读");
    expect(prompt.debug?.providerIds).toContain("persona.style");
  });

  it("skips persona style block when style fields are empty", () => {
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
        persona: {
          speakingStyle: " ",
          exampleLines: [" ", ""],
        },
      },
      scene,
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(
      prompt.systemHard.some((block) => block.includes("[persona.style]")),
    ).toBe(false);
    expect(prompt.debug?.providerIds).toContain("persona.style");
  });
});
