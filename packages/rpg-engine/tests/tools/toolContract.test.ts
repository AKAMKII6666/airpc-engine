/**
 * 模块名称：内置工具 description / inputSchema / Zod 校验
 */
import { describe, expect, it } from "vitest";
import {
  BUILTIN_TOOL_DEFINITIONS,
  getToolInputSchema,
  isEngineError,
  listBuiltinTools,
  parseToolArgs,
} from "../../src/index.js";

describe("builtin tool descriptions and inputSchema", () => {
  it("ten tools each have non-empty description and serializable inputSchema", () => {
    const tools = listBuiltinTools();
    expect(tools).toHaveLength(10);
    for (const t of tools) {
      expect(t.description.trim().length).toBeGreaterThan(10);
      expect(t.inputSchema).toBeTruthy();
      expect(() => JSON.stringify(t.inputSchema)).not.toThrow();
      const json = JSON.stringify(t.inputSchema);
      expect(json).toContain("properties");
    }
  });

  it("search_memory description guides search then get_memory_by_id", () => {
    const search = BUILTIN_TOOL_DEFINITIONS.find(function (t) {
      return t.toolId === "search_memory";
    });
    expect(search?.description).toMatch(/search_memory|本工具/);
    expect(search?.description).toMatch(/get_memory_by_id/);
  });

  it("P0 trigger phrases appear in key tool descriptions", () => {
    const byId = Object.fromEntries(
      BUILTIN_TOOL_DEFINITIONS.map(function (t) {
        return [t.toolId, t.description];
      }),
    );
    expect(byId.schedule_reminder_call).toMatch(/明确/);
    expect(byId.schedule_reminder_call).toMatch(/schedule_recurring_call/);
    expect(byId.schedule_recurring_call).toMatch(/schedule_reminder_call/);
    expect(byId.create_research_commitment).toMatch(/同意/);
    expect(byId.record_shared_secret).toMatch(/秘密/);
    expect(byId.record_user_name).toMatch(/编造/);
    expect(byId.share_expert_number).toMatch(/报号|口播/);
    expect(byId.refer_to_expert).toMatch(/回电|互斥/);
  });

  it("inputSchema field descriptions include examples for key args", () => {
    const refer = JSON.stringify(
      BUILTIN_TOOL_DEFINITIONS.find(function (t) {
        return t.toolId === "refer_to_expert";
      })?.inputSchema,
    );
    expect(refer).toMatch(/户外露营|topic_hint|目标专家/);
    const secret = JSON.stringify(
      BUILTIN_TOOL_DEFINITIONS.find(function (t) {
        return t.toolId === "record_shared_secret";
      })?.inputSchema,
    );
    expect(secret).toMatch(/小卖部|代号|recall_hint/);
    const name = JSON.stringify(
      BUILTIN_TOOL_DEFINITIONS.find(function (t) {
        return t.toolId === "record_user_name";
      })?.inputSchema,
    );
    expect(name).toMatch(/豆豆|nickname/);
  });

  it("getToolInputSchema covers all registry toolIds", () => {
    for (const t of BUILTIN_TOOL_DEFINITIONS) {
      expect(getToolInputSchema(t.toolId)).toBeTruthy();
    }
  });
});

describe("compute_bazi_chart contract", () => {
  it("describes trigger and safety boundary", () => {
    const bazi = BUILTIN_TOOL_DEFINITIONS.find(function (t) {
      return t.toolId === "compute_bazi_chart";
    });
    expect(bazi?.description).toMatch(/八字|生日/);
    expect(bazi?.description).toMatch(/禁止|重大决定/);
  });
});

describe("parseToolArgs", () => {
  it("accepts valid refer_to_expert args", () => {
    const parsed = parseToolArgs("refer_to_expert", {
      target_agent_id: "xiaopi",
      card_id: "card_a",
      package_id: "pkg_a",
      topic_hint: "引荐",
      delay_minutes: 5,
    });
    expect(isEngineError(parsed)).toBe(false);
    if (isEngineError(parsed)) return;
    expect(parsed.target_agent_id).toBe("xiaopi");
  });

  it("rejects refer_to_expert without target_agent_id", () => {
    const parsed = parseToolArgs("refer_to_expert", {
      card_id: "card_a",
      package_id: "pkg_a",
    });
    expect(isEngineError(parsed)).toBe(true);
    if (!isEngineError(parsed)) return;
    expect(parsed.code).toBe("VALIDATION_FAILED");
    expect(parsed.message).toMatch(/refer_to_expert/);
  });

  it("rejects search_memory without query or time window", () => {
    const parsed = parseToolArgs("search_memory", { max_results: 3 });
    expect(isEngineError(parsed)).toBe(true);
  });

  it("accepts search_memory with text_query", () => {
    const parsed = parseToolArgs("search_memory", { text_query: "上次" });
    expect(isEngineError(parsed)).toBe(false);
  });

  it("rejects schedule_recurring_call without card target", () => {
    const parsed = parseToolArgs("schedule_recurring_call", {
      topic_hint: "morning",
      hour: 9,
    });
    expect(isEngineError(parsed)).toBe(true);
  });

  it("accepts compute_bazi_chart without birth_time", () => {
    const parsed = parseToolArgs("compute_bazi_chart", {
      calendar_type: "solar",
      birth_date: "1990-01-02",
    });
    expect(isEngineError(parsed)).toBe(false);
  });

  it("rejects compute_bazi_chart with malformed birth_time", () => {
    const parsed = parseToolArgs("compute_bazi_chart", {
      calendar_type: "solar",
      birth_date: "1990-01-02",
      birth_time: "25:01",
    });
    expect(isEngineError(parsed)).toBe(true);
  });
});
