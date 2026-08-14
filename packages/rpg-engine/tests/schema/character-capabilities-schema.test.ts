/**
 * 角色特殊能力 schema：角色只声明会哪些能力，不直接定义工具实现。
 */
import { describe, expect, it } from "vitest";
import {
  CharacterDefSchema,
  listEnabledCharacterToolCapabilityIds,
} from "../../src/index.js";

describe("CharacterDef capabilities schema", function () {
  it("parses enabled tool capabilities and dedupes ids for runtime use", function () {
    const parsed = CharacterDefSchema.parse({
      schemaVersion: 1,
      agentId: "bai-bansian",
      dialable: true,
      capabilities: {
        tools: [
          { toolId: "compute_bazi_chart" },
          { toolId: "compute_bazi_chart", enabled: true },
          { toolId: "disabled_tool", enabled: false },
        ],
      },
    });

    expect(parsed.capabilities?.tools?.[0]?.enabled).toBe(true);
    expect(listEnabledCharacterToolCapabilityIds(parsed)).toEqual([
      "compute_bazi_chart",
    ]);
  });
});
