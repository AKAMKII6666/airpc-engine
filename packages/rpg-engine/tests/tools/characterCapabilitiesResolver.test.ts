/**
 * 角色能力 × 卡 toolPolicy：特殊工具必须由 CharacterDef.capabilities 显式开放。
 */
import { describe, expect, it } from "vitest";
import {
  createToolRegistry,
  listToolsForCard,
  projectToolResolutionTrace,
  resolveToolPolicy,
  type CallCardDefinition,
  type CharacterDef,
  type RegisteredTool,
} from "../../src/index.js";

const SPECIAL_TOOL_ID = "__test_special_capability";

const specialTool: RegisteredTool = {
  definition: {
    toolId: SPECIAL_TOOL_ID,
    displayName: "测试专属能力",
    description: "测试用角色专属能力，不应被全角色开放。",
    inputSchema: { type: "object", properties: {} },
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    availability: "character_capability",
    behavior: "session_local",
  },
  source: {
    kind: "l1",
    providerId: "test-special",
    displayName: "测试能力包",
  },
  inheritByDefault: true,
};

const registry = createToolRegistry([specialTool]);

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

function specialTraceItem(
  trace: ReturnType<typeof projectToolResolutionTrace>,
) {
  return trace.items.find(function (item) {
    return item.toolId === SPECIAL_TOOL_ID;
  });
}

describe("resolveToolPolicy with character capabilities", function () {
  it("does not expose character_capability tools without character declaration", function () {
    const tools = listToolsForCard(freeCard(), { registry }).map(function (tool) {
      return tool.toolId;
    });

    expect(tools).not.toContain(SPECIAL_TOOL_ID);
  });

  it("exposes character_capability tools when the character declares them", function () {
    const resolved = resolveToolPolicy(freeCard(), {
      characterDef: characterWithSpecial(),
      registry,
    });

    expect(resolved.allowedToolIds).toContain(SPECIAL_TOOL_ID);
  });

  it("keeps allowlist constrained by character capabilities", function () {
    const card = freeCard({
      schemaVersion: 2,
      mode: "allowlist",
      allowedToolIds: [SPECIAL_TOOL_ID, "search_memory"],
    });

    expect(
      listToolsForCard(card, { registry }).map(function (tool) {
        return tool.toolId;
      }),
    ).toEqual(["search_memory"]);
    expect(
      listToolsForCard(card, {
        characterDef: characterWithSpecial(false),
        registry,
      }).map(function (tool) {
        return tool.toolId;
      }),
    ).toEqual(["search_memory"]);
    expect(
      listToolsForCard(card, {
        characterDef: characterWithSpecial(),
        registry,
      }).map(function (tool) {
        return tool.toolId;
      }),
    ).toEqual(["search_memory", SPECIAL_TOOL_ID]);
  });
});

describe("projectToolResolutionTrace with character capabilities", function () {
  it("projects registry, character capability, card policy, and final tool trace", function () {
    const trace = projectToolResolutionTrace(freeCard(), {
      characterDef: characterWithSpecial(),
      registry,
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

    const missing = projectToolResolutionTrace(freeCard(), { registry });
    expect(specialTraceItem(missing)).toMatchObject({
      declaredByCharacter: false,
      allowedByCharacter: false,
      exposedToLlm: false,
      reason: "character_capability_missing",
    });
  });
});
