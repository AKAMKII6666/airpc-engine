/**
 * patch_memory 严格化：只允许出口阶段追加普通 semantic 记忆。
 */
import { describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";
import type { CallSession } from "../../src/host/types.js";
import type { MemoryPort } from "../../src/memory/types.js";

function baseProfile() {
  return PlayerProfileSchema.parse({
    schemaVersion: 1,
    userId: "u1",
    user: {
      userId: "u1",
      nickname: "测",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function baseSession(): CallSession {
  return {
    schemaVersion: 1,
    sessionId: "s1",
    userId: "u1",
    chapterId: "pkg_demo",
    status: "executing_effects",
    startedAt: "2026-01-01T00:00:00.000Z",
    resolve: {
      source: "simulate",
      instanceId: "inst1",
      cardId: "card_a",
      agentId: "agent_a",
      intent: { kind: "simulate_start", chapterId: "pkg_demo", cardId: "card_a" },
    },
    frozenCard: {
      cardId: "card_a",
      ownerAgentId: "agent_a",
      entryMode: "inbound_user_dial",
      interactionMode: "realtime_dialogue",
    } as CallSession["frozenCard"],
    effectLedger: {},
  };
}

function recordingMemoryPort(patches: unknown[]): MemoryPort {
  return {
    async projectForCall() {
      return { softText: "", includedEntryIds: [] };
    },
    async search() {
      return [];
    },
    async getById() {
      return null;
    },
    async applyPatch(input) {
      patches.push(input);
    },
    async commitAfterCall() {
      return { ok: true, writtenLayers: [] };
    },
  };
}

describe("patch_memory strict policy", function () {
  it("normalizes valid semantic insert payload", async function () {
    const patches: unknown[] = [];
    const ok = await executeEffects(
      [{ id: "m1", effect: "patch_memory", text: "用户喜欢桂花乌龙。" }],
      {
        profile: baseProfile(),
        session: baseSession(),
        nowIso: "2026-07-14T00:00:00.000Z",
        memory: recordingMemoryPort(patches),
      },
    );
    expect(ok.status).toBe("completed");
    expect(patches[0]).toMatchObject({
      agentId: "agent_a",
      layer: "semantic",
      op: "insert",
      payload: { kind: "semantic", text: "用户喜欢桂花乌龙。" },
    });
  });

  it("rejects state-like layers before MemoryPort write", async function () {
    const patches: unknown[] = [];
    const bad = await executeEffects(
      [
        {
          id: "m2",
          effect: "patch_memory",
          layer: "commitments",
          text: "伪造一个履约状态",
        },
      ],
      {
        profile: baseProfile(),
        session: baseSession(),
        nowIso: "2026-07-14T00:01:00.000Z",
        memory: recordingMemoryPort(patches),
      },
    );
    expect(bad.status).toBe("completed_with_errors");
    expect(bad.results[0]).toMatchObject({ effectId: "m2", status: "failed" });
    expect(patches).toHaveLength(0);
  });

  it("rejects non-semantic kinds before MemoryPort write", async function () {
    const patches: unknown[] = [];
    const bad = await executeEffects(
      [
        {
          id: "m3",
          effect: "patch_memory",
          kind: "vignette",
          text: "这不是稳定语义事实",
        },
      ],
      {
        profile: baseProfile(),
        session: baseSession(),
        nowIso: "2026-07-14T00:02:00.000Z",
        memory: recordingMemoryPort(patches),
      },
    );
    expect(bad.status).toBe("completed_with_errors");
    expect(bad.results[0]).toMatchObject({
      effectId: "m3",
      status: "failed",
      error: expect.stringContaining("kind not allowed"),
    });
    expect(patches).toHaveLength(0);
  });
});
