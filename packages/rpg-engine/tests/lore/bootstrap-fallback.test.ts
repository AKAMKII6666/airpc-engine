/**
 * 模块名称：Lore bootstrap／fallback 测
 */
import { describe, expect, it } from "vitest";
import {
  bootstrapLoreOntoProfile,
  buildFallbackLore,
  isEngineError,
  resetEngineHostForTests,
  type LoreBootstrapPort,
  type PlayerProfile,
  type WorldLoreDoc,
} from "@airpc/rpg-engine";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../data");

function bareProfile(userId: string): PlayerProfile {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    userId,
    user: {
      userId,
      nickname: "t",
      location: {
        country: "中国",
        province: "广东省",
        city: "深圳市",
      },
      createdAt: now,
      updatedAt: now,
    },
    characters: {},
    stories: {},
    callCards: { board: { byAgent: {} } },
    world: { lore: null, facts: [], knowledge: {} },
    schedule: { clockMs: 0, intents: [] },
    research: { commitments: [] },
  };
}

function mockLlmPort(lore: WorldLoreDoc): LoreBootstrapPort {
  return {
    generate: async function () {
      return lore;
    },
  };
}

describe("lore bootstrap", function () {
  it("buildFallbackLore sets source=fallback", function () {
    const lore = buildFallbackLore({
      user: bareProfile("u").user,
      characters: [
        {
          schemaVersion: 1,
          agentId: "xiaopi",
          displayName: "小雨",
          dialable: false,
        },
      ],
      nowIso: "2026-01-01T00:00:00.000Z",
    });
    expect(lore.source).toBe("fallback");
    expect(lore.sharedPremise).toContain("深圳");
  });

  it("mock LLM port writes source=llm", async function () {
    const llmDoc: WorldLoreDoc = {
      version: 1,
      source: "llm",
      generatedAt: "2026-01-01T00:00:00.000Z",
      location: {
        country: "中国",
        province: "广东省",
        city: "深圳市",
      },
      sharedPremise: "LLM 生成的深圳日常电话世界。",
      perspectives: {
        xiaopi: ["你知道用户在深圳附近。"],
      },
      characters: {
        xiaopi: { displayName: "小雨", blurb: "本地可通话角色" },
      },
    };
    const profile = bareProfile("u-llm");
    const result = await bootstrapLoreOntoProfile({
      profile,
      characters: [
        {
          schemaVersion: 1,
          agentId: "xiaopi",
          displayName: "小雨",
          dialable: false,
        },
      ],
      port: mockLlmPort(llmDoc),
      force: true,
    });
    expect(result.usedFallback).toBe(false);
    expect(result.lore.source).toBe("llm");
    expect(result.lore.sharedPremise).toContain("LLM");
    expect(profile.world.lore?.source).toBe("llm");
  });

  it("port failure falls back", async function () {
    const failing: LoreBootstrapPort = {
      generate: async function () {
        throw new Error("network down");
      },
    };
    const profile = bareProfile("u2");
    const result = await bootstrapLoreOntoProfile({
      profile,
      characters: [],
      port: failing,
    });
    expect(result.usedFallback).toBe(true);
    expect(result.lore.source).toBe("fallback");
    expect(result.errorMessage).toContain("network down");
    expect(profile.world.lore).toEqual(result.lore);
  });

  it("host.bootstrapLore without port uses fallback", async function () {
    resetEngineHostForTests();
    const host = createTestHost({ persist: false, dataRoot: rootDir });
    await host.loadWorkspace(rootDir, { resetRuntime: true });
    const userId = "demo-user";
    const p = await host.ensureProfile(userId);
    p.user.location = {
      country: "中国",
      province: "广东省",
      city: "深圳市",
    };
    const out = await host.bootstrapLore(userId, { force: true });
    expect(isEngineError(out)).toBe(false);
    if (!isEngineError(out)) {
      expect(out.lore.source).toBe("fallback");
      expect(out.usedFallback).toBe(true);
    }
  });

  it("host.bootstrapLore with mock LLM port writes llm", async function () {
    resetEngineHostForTests();
    const llmDoc: WorldLoreDoc = {
      version: 1,
      source: "llm",
      generatedAt: "2026-07-15T00:00:00.000Z",
      location: {
        country: "中国",
        province: "广东省",
        city: "广州市",
      },
      sharedPremise: "Host 注入 mock LLM Lore。",
      perspectives: {},
    };
    const host = createTestHost({
      persist: false,
      dataRoot: rootDir,
      loreBootstrap: mockLlmPort(llmDoc),
    });
    await host.loadWorkspace(rootDir, { resetRuntime: true });
    const userId = "demo-user";
    const p = await host.ensureProfile(userId);
    p.user.location = {
      country: "中国",
      province: "广东省",
      city: "广州市",
    };
    const out = await host.bootstrapLore(userId, { force: true });
    expect(isEngineError(out)).toBe(false);
    if (!isEngineError(out)) {
      expect(out.usedFallback).toBe(false);
      expect(out.lore.source).toBe("llm");
      expect(out.lore.sharedPremise).toContain("mock LLM");
    }
    expect(p.world.lore?.source).toBe("llm");
  });

  it("host.bootstrapLore port throw still writes fallback", async function () {
    resetEngineHostForTests();
    const failing: LoreBootstrapPort = {
      generate: async function () {
        throw new Error("vendor 503");
      },
    };
    const host = createTestHost({
      persist: false,
      dataRoot: rootDir,
      loreBootstrap: failing,
    });
    await host.loadWorkspace(rootDir, { resetRuntime: true });
    const userId = "demo-user";
    const p = await host.ensureProfile(userId);
    p.user.location = {
      country: "中国",
      province: "浙江省",
      city: "杭州市",
    };
    const out = await host.bootstrapLore(userId, { force: true });
    expect(isEngineError(out)).toBe(false);
    if (!isEngineError(out)) {
      expect(out.usedFallback).toBe(true);
      expect(out.lore.source).toBe("fallback");
      expect(out.errorMessage).toContain("vendor 503");
    }
    expect(p.world.lore?.source).toBe("fallback");
  });
});
