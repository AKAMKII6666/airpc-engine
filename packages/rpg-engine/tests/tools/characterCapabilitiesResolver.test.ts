/**
 * 角色能力 × 卡 toolPolicy：特殊工具必须由 CharacterDef.capabilities 显式开放。
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  BUILTIN_TOOL_DEFINITIONS,
  listToolsForCard,
  projectToolResolutionTrace,
  resolveToolPolicy,
  type CallCardDefinition,
  type CharacterDef,
  type ToolDefinition,
} from "../../src/index.js";

const SPECIAL_TOOL_ID = "__test_special_capability";

const specialTool: ToolDefinition = {
  toolId: SPECIAL_TOOL_ID,
  displayName: "测试专属能力",
  description: "测试用角色专属能力，不应被全角色开放。",
  inputSchema: { type: "object", properties: {} },
  allowedCardKinds: ["free", "story"],
  allowedInPlayback: false,
  availability: "character_capability",
  behavior: "session_local",
};

function freeCard(
  toolPolicy: CallCardDefinition["toolPolicy"] = { mode: "inherit_free" },
): CallCardDefinition {
  return {
    cardId: "free_card",
    cardKind: "free",
    title: "自由通话",
    ownerAgentId: "agent_a",
    entryMode: "either",
    interactionMode: "realtime_dialogue",
    context: {},
    exits: [],
    toolPolicy,
  };
}

function characterWithSpecial(enabled = true): CharacterDef {
  return {
    schemaVersion: 1,
    agentId: "agent_a",
    dialable: true,
    capabilities: {
      tools: [{ toolId: SPECIAL_TOOL_ID, enabled }],
    },
  };
}

function pushSpecialTool(): void {
  if (
    BUILTIN_TOOL_DEFINITIONS.some(function (tool) {
      return tool.toolId === SPECIAL_TOOL_ID;
    })
  ) {
    return;
  }
  BUILTIN_TOOL_DEFINITIONS.push(specialTool);
}

function specialTraceItem(
  trace: ReturnType<typeof projectToolResolutionTrace>,
) {
  return trace.items.find(function (item) {
    return item.toolId === SPECIAL_TOOL_ID;
  });
}

afterEach(function () {
  const index = BUILTIN_TOOL_DEFINITIONS.findIndex(function (tool) {
    return tool.toolId === SPECIAL_TOOL_ID;
  });
  if (index >= 0) {
    BUILTIN_TOOL_DEFINITIONS.splice(index, 1);
  }
});

describe("resolveToolPolicy with character capabilities", function () {
  it("does not expose character_capability tools without character declaration", function () {
    pushSpecialTool();

    const tools = listToolsForCard(freeCard()).map(function (tool) {
      return tool.toolId;
    });

    expect(tools).not.toContain(SPECIAL_TOOL_ID);
  });

  it("exposes character_capability tools when the character declares them", function () {
    pushSpecialTool();

    const resolved = resolveToolPolicy(freeCard(), {
      characterDef: characterWithSpecial(),
    });

    expect(resolved.allowedToolIds).toContain(SPECIAL_TOOL_ID);
  });

  it("keeps allowlist constrained by character capabilities", function () {
    pushSpecialTool();

    const card = freeCard({
      mode: "allowlist",
      allowedToolIds: [SPECIAL_TOOL_ID, "search_memory"],
    });

    expect(
      listToolsForCard(card).map(function (tool) {
        return tool.toolId;
      }),
    ).toEqual(["search_memory"]);
    expect(
      listToolsForCard(card, {
        characterDef: characterWithSpecial(false),
      }).map(function (tool) {
        return tool.toolId;
      }),
    ).toEqual(["search_memory"]);
    expect(
      listToolsForCard(card, {
        characterDef: characterWithSpecial(),
      }).map(function (tool) {
        return tool.toolId;
      }),
    ).toEqual(["search_memory", SPECIAL_TOOL_ID]);
  });
});

describe("projectToolResolutionTrace with character capabilities", function () {
  it("projects registry, character capability, card policy, and final tool trace", function () {
    pushSpecialTool();

    const trace = projectToolResolutionTrace(freeCard(), {
      characterDef: characterWithSpecial(),
    });

    expect(trace.registryToolIds).toContain(SPECIAL_TOOL_ID);
    expect(trace.characterCapabilityToolIds).toEqual([SPECIAL_TOOL_ID]);
    expect(trace.cardPolicyMode).toBe("inherit_free");
    expect(trace.finalToolIds).toContain(SPECIAL_TOOL_ID);
    expect(specialTraceItem(trace)).toMatchObject({
      availability: "character_capability",
      declaredByCharacter: true,
      allowedByCharacter: true,
      exposedToLlm: true,
      reason: "exposed",
    });

    const missing = projectToolResolutionTrace(freeCard());
    expect(specialTraceItem(missing)).toMatchObject({
      declaredByCharacter: false,
      allowedByCharacter: false,
      exposedToLlm: false,
      reason: "character_capability_missing",
    });
  });
});
