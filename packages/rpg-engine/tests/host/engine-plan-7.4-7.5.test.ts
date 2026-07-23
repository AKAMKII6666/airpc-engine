/**
 * V1-E10 / 增强计划 §7.4–7.5 回归：
 * - 7.4 章节清场 + next（含无 next / delay 提前呼入）
 * - 7.5 EffectSink 成功/失败/critical/延迟 resolve/reject；endCall 等待 sink
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createRecordingEffectSink,
  findActiveStoryLock,
  isEngineError,
  PlayerProfileSchema,
  type CallCardDefinition,
  type CallSession,
  type Effect,
  type EffectSink,
  type EffectSinkResult,
} from "../../src/index.js";
import { executeEffects } from "../../src/runtime/effectExecutor.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

function delaySink(ms: number): EffectSink & { resolvedAt?: number } {
  const sink: EffectSink & { resolvedAt?: number } = {
    async applyMediaEffect(): Promise<EffectSinkResult> {
      await new Promise((r) => setTimeout(r, ms));
      sink.resolvedAt = Date.now();
      return { ok: true };
    },
  };
  return sink;
}

function failingSink(error = "sink boom"): EffectSink {
  return {
    applyMediaEffect() {
      return { ok: false, error };
    },
  };
}

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
    packageId: "pkg",
    status: "executing_effects",
    startedAt: "2026-01-01T00:00:00.000Z",
    resolve: {
      source: "simulate",
      instanceId: "inst1",
      cardId: "card_a",
      agentId: "agent_a",
      intent: {
        kind: "simulate_start",
        packageId: "pkg",
        cardId: "card_a",
      },
    },
    frozenCard: {
      cardId: "card_a",
      ownerAgentId: "agent_a",
      entryMode: "inbound_user_dial",
      interactionMode: "realtime_dialogue",
    } as CallSession["frozenCard"],
    composeScene: {
      callDirection: "inbound",
      localTime: {
        isoWithOffset: "2026-01-01T12:00:00+08:00",
        localHour: 12,
      },
      timeMentionPolicy: "allow_casual",
    },
    channel: "manual",
    interactionPhase: "dialogue",
    phoneFlags: {},
    completedBeats: [],
    toolTrace: [],
    exitCandidates: [],
    effectLedger: {},
  };
}

async function cloneChapter02(dataRoot: string): Promise<void> {
  const srcPkg = path.join(dataRoot, "storis-packages/golden_handoff");
  const dstPkg = path.join(dataRoot, "storis-packages/chapter_02");
  await cp(srcPkg, dstPkg, { recursive: true });
  const confPath = path.join(dstPkg, "story.conf.json");
  const conf = JSON.parse(await readFile(confPath, "utf8")) as {
    packageId?: string;
    title?: string;
  };
  conf.packageId = "chapter_02";
  conf.title = "Chapter 02";
  await writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");
}

describe("引擎 §7.4–7.5 回归 (V1-E10)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  describe("§7.4 章节结束点清场并安排下一章节", () => {
    it("end_story(next)：completed + 释放 lock + 清旧 pending/once + 挂下一章入口", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.4-next-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });
      await cloneChapter02(dataRoot);

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const profile = await host.ensureProfile("demo-user");
      profile.characters.xiaopi = { agentId: "xiaopi", unlocked: true };
      profile.stories.golden_handoff = {
        packageId: "golden_handoff",
        status: "active",
        variables: {},
        lock: {
          activeStoryInstanceId: "inst-7.4",
          packageId: "golden_handoff",
          lockLevel: "soft",
          allowedAgentIds: ["lanxing", "xiaopi"],
          blockedPolicy: "allow_with_warning",
          reason: "7.4-next",
          startedAt: "2026-07-14T00:00:00.000Z",
        },
      };
      profile.callCards.board.byAgent.xiaopi = {
        pending: [
          {
            instanceId: "old-pending",
            cardId: "xiaopi_waiting_user",
            packageId: "golden_handoff",
            agentId: "xiaopi",
            status: "pending",
            entryMode: "inbound_user_dial",
            createdAt: "2026-07-14T00:00:00.000Z",
          },
        ],
      };
      profile.schedule = {
        clockMs: 0,
        intents: [
          {
            kind: "once",
            intentId: "once-old-ch1",
            agentId: "xiaopi",
            cardId: "xiaopi_waiting_user",
            packageId: "golden_handoff",
            fireAtMs: 60_000,
            status: "pending",
            linkedInstanceId: "old-pending",
          },
        ],
      };

      const resolved = await host.resolveAsync("demo-user", {
        kind: "simulate_start",
        packageId: "golden_handoff",
        cardId: "doubao_intro_outbound",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const card = session.frozenCard as CallCardDefinition;
      card.exits = [
        {
          exitId: "end_to_ch2",
          exitKind: "terminal",
          priority: 200,
          condition: { op: "always" },
          effects: [
            {
              id: "end_with_next",
              effect: "end_story",
              reason: "to_chapter_02",
              cleanup: { clearStoryCards: "all", preserveFreeCards: true },
              next: {
                packageId: "chapter_02",
                agentId: "xiaopi",
                cardId: "xiaopi_waiting_user",
                activation: "wait_user_dial",
              },
            },
          ],
        },
      ];

      const end = await host.endCall(session.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });
      expect(isEngineError(end)).toBe(false);
      if (isEngineError(end)) return;

      const after = await host.ensureProfile("demo-user");
      expect(
        (after.stories.golden_handoff as { status?: string }).status,
      ).toBe("completed");
      expect(findActiveStoryLock(after)).toBeNull();
      expect(
        (after.callCards.board.byAgent.xiaopi?.pending ?? []).some(
          (p) => p.instanceId === "old-pending",
        ),
      ).toBe(false);
      const oldOnce = after.schedule?.intents?.find(
        (row) =>
          row !== null &&
          typeof row === "object" &&
          (row as { intentId?: string }).intentId === "once-old-ch1",
      ) as { status?: string };
      expect(oldOnce?.status).toBe("cancelled");

      const entry = after.callCards.board.byAgent.xiaopi?.pending.find(
        (p) =>
          p.packageId === "chapter_02" &&
          p.cardId === "xiaopi_waiting_user" &&
          p.status === "pending",
      );
      expect(entry).toBeTruthy();
      expect(
        (after.stories.chapter_02 as { plannedEntry?: { cardId?: string } })
          .plannedEntry?.cardId,
      ).toBe("xiaopi_waiting_user");
    });

    it("end_story(无 next)：清场后任意角色 user_dial source===free", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.4-free-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const profile = await host.ensureProfile("demo-user");
      profile.characters.xiaopi = { agentId: "xiaopi", unlocked: true };
      profile.stories.golden_handoff = {
        packageId: "golden_handoff",
        status: "active",
        variables: {},
        lock: {
          activeStoryInstanceId: "inst-7.4-free",
          packageId: "golden_handoff",
          lockLevel: "soft",
          allowedAgentIds: ["lanxing", "xiaopi"],
          blockedPolicy: "allow_with_warning",
          reason: "7.4-free",
          startedAt: "2026-07-14T00:00:00.000Z",
        },
      };
      profile.callCards.board.byAgent.xiaopi = {
        pending: [
          {
            instanceId: "old-story-pending",
            cardId: "xiaopi_waiting_user",
            packageId: "golden_handoff",
            agentId: "xiaopi",
            status: "pending",
            entryMode: "inbound_user_dial",
            createdAt: "2026-07-14T00:00:00.000Z",
          },
        ],
      };

      const resolved = await host.resolveAsync("demo-user", {
        kind: "simulate_start",
        packageId: "golden_handoff",
        cardId: "doubao_intro_outbound",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const card = session.frozenCard as CallCardDefinition;
      card.exits = [
        {
          exitId: "end_no_next",
          exitKind: "terminal",
          priority: 200,
          condition: { op: "always" },
          effects: [
            {
              id: "end_alone",
              effect: "end_story",
              reason: "chapter_done",
              cleanup: { clearStoryCards: "all", preserveFreeCards: true },
            },
          ],
        },
      ];

      const end = await host.endCall(session.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });
      expect(isEngineError(end)).toBe(false);
      if (isEngineError(end)) return;

      for (const agentId of ["xiaopi", "lanxing"] as const) {
        const dial = await host.resolveAsync("demo-user", {
          kind: "user_dial",
          agentId,
        });
        expect(isEngineError(dial)).toBe(false);
        if (isEngineError(dial)) return;
        expect(dial.source).toBe("free");
      }
    });

    it("end_story(next delay)：提前呼入消费 linked once，后续 tick 不重复", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.4-delay-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });
      await cloneChapter02(dataRoot);

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const profile = await host.ensureProfile("demo-user");
      profile.characters.xiaopi = { agentId: "xiaopi", unlocked: true };
      profile.stories.golden_handoff = {
        packageId: "golden_handoff",
        status: "active",
        variables: {},
        lock: {
          activeStoryInstanceId: "inst-7.4-delay",
          packageId: "golden_handoff",
          lockLevel: "soft",
          allowedAgentIds: ["lanxing", "xiaopi"],
          blockedPolicy: "allow_with_warning",
          reason: "7.4-delay",
          startedAt: "2026-07-14T00:00:00.000Z",
        },
      };
      profile.callCards.board.byAgent.xiaopi = { pending: [] };
      profile.schedule = { clockMs: 0, intents: [] };

      const resolved = await host.resolveAsync("demo-user", {
        kind: "simulate_start",
        packageId: "golden_handoff",
        cardId: "doubao_intro_outbound",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const card = session.frozenCard as CallCardDefinition;
      card.exits = [
        {
          exitId: "end_delay_next",
          exitKind: "terminal",
          priority: 200,
          condition: { op: "always" },
          effects: [
            {
              id: "end_delay",
              effect: "end_story",
              cleanup: { clearStoryCards: "all", preserveFreeCards: true },
              next: {
                packageId: "chapter_02",
                agentId: "xiaopi",
                cardId: "xiaopi_waiting_user",
                activation: "delay",
                delayMs: 300_000,
                entryMode: "either",
                activationHint: "outbound_auto",
              },
            },
          ],
        },
      ];

      const end = await host.endCall(session.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });
      expect(isEngineError(end)).toBe(false);
      if (isEngineError(end)) return;

      const mid = await host.ensureProfile("demo-user");
      const entry = mid.callCards.board.byAgent.xiaopi?.pending.find(
        (p) =>
          p.packageId === "chapter_02" &&
          p.cardId === "xiaopi_waiting_user" &&
          p.status === "pending",
      );
      expect(entry).toBeTruthy();
      expect(entry?.scheduledIntentId).toBe("chapter_next:end_delay");
      const once = mid.schedule?.intents?.find(
        (row) =>
          row !== null &&
          typeof row === "object" &&
          (row as { intentId?: string }).intentId === "chapter_next:end_delay",
      ) as { status?: string; linkedInstanceId?: string };
      expect(once?.status).toBe("pending");
      expect(once?.linkedInstanceId).toBe(entry?.instanceId);

      const dial = await host.resolveAsync("demo-user", {
        kind: "user_dial",
        agentId: "xiaopi",
      });
      expect(isEngineError(dial)).toBe(false);
      if (isEngineError(dial)) return;
      expect(dial.source).toBe("story_pending");
      expect(dial.cardId).toBe("xiaopi_waiting_user");
      expect(dial.packageId).toBe("chapter_02");

      const call = await host.beginCall("demo-user", dial, {
        channel: "manual",
      });
      expect(isEngineError(call)).toBe(false);
      if (isEngineError(call)) return;
      expect(call.actualEntry).toBe("inbound_user_dial");

      const afterEarly = await host.ensureProfile("demo-user");
      const consumed = afterEarly.schedule?.intents?.find(
        (row) =>
          row !== null &&
          typeof row === "object" &&
          (row as { intentId?: string }).intentId === "chapter_next:end_delay",
      ) as { status?: string };
      expect(consumed?.status).toBe("consumed");

      await host.endCall(call.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });

      const fired = host.advanceClock("demo-user", 300_000);
      expect(isEngineError(fired)).toBe(false);
      if (isEngineError(fired)) return;
      expect(
        fired.filter((f) => f.cardId === "xiaopi_waiting_user"),
      ).toHaveLength(0);
    });
  });

  describe("§7.5 EffectSink 必须等待成功", () => {
    it("Recording sink 成功：media effect=executed，ledger 写入", async () => {
      const session = baseSession();
      const sink = createRecordingEffectSink();
      const plan = await executeEffects(
        [{ id: "m1", effect: "play_system_prompt", clipId: "clip_ok" }],
        {
		profile: baseProfile(),
          session,
          nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: sink,
        },
      );
      expect(plan.status).toBe("completed");
      expect(plan.results[0]?.status).toBe("executed");
      expect(sink.calls).toHaveLength(1);
      expect(
        Object.values(session.effectLedger).some((v) => v.status === "executed"),
      ).toBe(true);
    });

    it("Failing sink 非 critical：failed + completed_with_errors，后续继续", async () => {
      const session = baseSession();
      const plan = await executeEffects(
        [
          { id: "m-fail", effect: "play_system_prompt", clipId: "x" },
          {
            id: "later",
            effect: "set_world_fact",
            factId: "after_fail",
            value: true,
          },
        ],
        {
		profile: baseProfile(),
          session,
          nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: failingSink("media denied"),
        },
      );
      expect(plan.status).toBe("completed_with_errors");
      expect(plan.results.map((r) => r.status)).toEqual(["failed", "executed"]);
      // §7.5 / §6.3.5：sink 失败不得写入 ledger executed
      const executedKeys = Object.entries(session.effectLedger).filter(
        ([, v]) => v.status === "executed",
      );
      expect(executedKeys.some(([k]) => k.endsWith(":m-fail"))).toBe(false);
      expect(executedKeys.some(([k]) => k.endsWith(":later"))).toBe(true);
    });

    it("Failing sink critical：failed + aborted，后续 skipped", async () => {
      const session = baseSession();
      const plan = await executeEffects(
        [
          {
            id: "m-crit",
            effect: "play_system_prompt",
            clipId: "clip_crit",
            critical: true,
          },
          {
            id: "skip",
            effect: "set_world_fact",
            factId: "nope",
            value: true,
          },
        ],
        {
		profile: baseProfile(),
          session,
          nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: failingSink("hw down"),
        },
      );
      expect(plan.status).toBe("aborted");
      expect(plan.results.map((r) => r.status)).toEqual(["failed", "skipped"]);
      expect(
        Object.entries(session.effectLedger).some(
          ([k, v]) => k.endsWith(":m-crit") && v.status === "executed",
        ),
      ).toBe(false);
      expect(Object.keys(session.effectLedger)).toHaveLength(0);
    });

    it("Sink Promise reject：effect=failed", async () => {
      const sink: EffectSink = {
        applyMediaEffect() {
          return Promise.reject(new Error("reject boom"));
        },
      };
      const session = baseSession();
      const plan = await executeEffects(
        [{ id: "m-rej", effect: "play_system_prompt", clipId: "r" }],
        {
		profile: baseProfile(),
          session,
          nowIso: "2026-07-14T00:00:00.000Z",
        effectSink: sink,
        },
      );
      expect(plan.status).toBe("completed_with_errors");
      expect(plan.results[0]?.status).toBe("failed");
      expect(plan.results[0]?.error).toContain("reject boom");
      expect(
        Object.entries(session.effectLedger).some(
          ([k, v]) => k.endsWith(":m-rej") && v.status === "executed",
        ),
      ).toBe(false);
    });

    it("Sink 延迟 resolve：endCall 须等待后才返回", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.5-endcall-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });

      const sink = delaySink(50);
      const host = createTestHost({
        persist: false,
        dataRoot,
        effectSink: sink,
      });
      await host.loadWorkspace(dataRoot);
      await host.ensureProfile("demo-user");

      const resolved = await host.resolveAsync("demo-user", {
        kind: "simulate_start",
        packageId: "golden_handoff",
        cardId: "doubao_intro_outbound",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const card = session.frozenCard as CallCardDefinition;
      const mediaEffects: Effect[] = [
        {
          id: "media_wait",
          effect: "play_system_prompt",
          clipId: "wait_clip",
        },
      ];
      card.exits = [
        {
          exitId: "with_media",
          exitKind: "terminal",
          priority: 200,
          condition: { op: "always" },
          effects: mediaEffects,
        },
      ];

      const started = Date.now();
      const end = await host.endCall(session.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });
      const elapsed = Date.now() - started;
      expect(isEngineError(end)).toBe(false);
      if (isEngineError(end)) return;
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(sink.resolvedAt).toBeTruthy();
      expect(end.effectPlanResult?.status).toBe("completed");
      expect(end.effectPlanResult?.results[0]?.status).toBe("executed");
    });
  });
});
