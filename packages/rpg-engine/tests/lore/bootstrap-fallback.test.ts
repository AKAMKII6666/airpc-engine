/**
 * 模块名称：Lore bootstrap／fallback 测
 */
import { describe, expect, it } from "vitest";
import {
  bootstrapLoreOntoProfile,
  buildFallbackLore,
  createEngineHost,
  isEngineError,
  resetEngineHostForTests,
  type LoreBootstrapPort,
  type PlayerProfile,
} from "@airpc/rpg-engine";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../data",
);

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

describe("lore bootstrap", function () {
  it("buildFallbackLore sets source=fallback", function () {
    const lore = buildFallbackLore({
      user: bareProfile("u").user,
      characters: [
        {
          schemaVersion: 1,
          agentId: "xiaoyu",
          displayName: "小雨",
          dialable: false,
        },
      ],
      nowIso: "2026-01-01T00:00:00.000Z",
    });
    expect(lore.source).toBe("fallback");
    expect(lore.sharedPremise).toContain("深圳");
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
    expect(profile.world.lore).toEqual(result.lore);
  });

  it("host.bootstrapLore writes profile", async function () {
    resetEngineHostForTests();
    const host = createEngineHost({ persist: false, autoMemory: false });
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
});
