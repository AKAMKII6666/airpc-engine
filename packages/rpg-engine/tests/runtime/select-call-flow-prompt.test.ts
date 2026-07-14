/**
 * 模块名称：过程话术选型单元测
 */
import { describe, expect, it } from "vitest";
import { selectCallFlowPrompt } from "@airpc/rpg-engine";
import type { CharacterDef } from "@airpc/rpg-engine";

describe("selectCallFlowPrompt", function () {
  it("picks first longSilence variant for silence_timeout", function () {
    const character = {
      agentId: "x",
      dialable: true,
      callFlowPrompts: {
        longSilence: [
          { variantId: "s1", text: "还在吗？" },
          { variantId: "s2", text: "喂？" },
        ],
      },
    } as CharacterDef;
    const pick = selectCallFlowPrompt(character, "silence_timeout");
    expect(pick.variantId).toBe("s1");
    expect(pick.text).toBe("还在吗？");
    expect(pick.promptKey).toBe("longSilence");
  });

  it("returns no_variants when missing", function () {
    const character = { agentId: "x", dialable: true } as CharacterDef;
    const pick = selectCallFlowPrompt(character, "pre_hangup_hint");
    expect(pick.text).toBeNull();
    expect(pick.reason).toContain("no_variants");
  });
});
