/**
 * S3：schedule_call_card → advanceClock → agent_outbound begin
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  FREE_CHAPTER_ID,
  isEngineError,
} from "../../src/index.js";
import type { RegisterExitContext } from "../../src/tools/expandExitEffects.js";
import { expandRegisterExitEffects } from "../../src/tools/expandExitEffects.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

const freeCtx: RegisterExitContext = {
  sessionAgentId: "lanxing",
  sessionCardId: "lanxing_free",
  sessionChapterId: FREE_CHAPTER_ID,
  sessionCardKind: "free",
};

describe("schedule → outbound (S3)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("expand：Free 提醒由当前自由卡派生目标；refer / recurring 仍拒绝裸目标", () => {
    const badRefer = expandRegisterExitEffects(
      "refer_to_expert",
      { target_agent_id: "xiaopi", topic_hint: "hello" },
      freeCtx,
    );
    expect(isEngineError(badRefer)).toBe(true);

    const bareRecurring = expandRegisterExitEffects(
      "schedule_recurring_call",
      { topic_hint: "bare", hour: 9, minute: 0 },
      freeCtx,
    );
    expect(isEngineError(bareRecurring)).toBe(true);

    const ok = expandRegisterExitEffects(
      "schedule_reminder_call",
      {
        delay_minutes: 1,
        topic_hint: "ok",
      },
      freeCtx,
    );
    expect(isEngineError(ok)).toBe(false);
    if (isEngineError(ok)) return;
    expect(ok[0]?.effect).toBe("schedule_call_card");
    expect(ok[0]?.cardId).toBe("lanxing_free");
    expect(ok[0]?.chapterId).toBe(FREE_CHAPTER_ID);
  });

  it("Free 挂机写入 schedule → advanceClock → agent_outbound begin Manual", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s3-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "schedule_reminder_call", {
      delay_minutes: 10,
      topic_hint: "followup",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;

    const profile = await host.ensureProfile("demo-user");
    const once = profile.schedule?.intents?.at(-1) as
      | {
          intentId?: string;
          cardId?: string;
          fireAtMs?: number;
          origin?: string;
        }
      | undefined;
    expect(once?.cardId).toBe("lanxing_free");
    expect(once?.origin).toBe("user_reminder");

    const fired = host.advanceClock("demo-user", 10 * 60_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(fired.some((f) => f.cardId === "lanxing_free")).toBe(true);

    const outbound = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "lanxing",
    });
    expect(isEngineError(outbound)).toBe(false);
    if (isEngineError(outbound)) return;
    expect(outbound.source).toBe("story_pending");
    expect(outbound.cardId).toBe("lanxing_free");

    const call2 = await host.beginCall("demo-user", outbound, {
      channel: "manual",
    });
    expect(isEngineError(call2)).toBe(false);
    if (isEngineError(call2)) return;
    expect(call2.status).toBe("in_call");
    expect(call2.beginContext).toMatchObject({
      source: "schedule_reminder",
      topicHint: "followup",
      scheduledIntentId: once?.intentId,
    });
    expect(call2.renderedPrompt?.systemHard.join("\n")).toContain(
      "回电话题：followup",
    );
    expect(call2.renderedPrompt?.systemHard.join("\n")).toContain(
      "[scheduled.callback.user_reminder]",
    );
    expect(call2.renderedPrompt?.systemHard.join("\n")).toContain(
      "用户口头预约的提醒/回电",
    );
  });

  it("专家引荐回电使用 expert_referral 来源，不误判成用户预约提醒", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s3-expert-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "refer_to_expert", {
      target_agent_id: "xiaopi",
      card_id: "xiaopi_waiting_user",
      package_id: "golden_handoff",
      topic_hint: "露营安全",
      delay_minutes: 5,
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;

    const profile = await host.ensureProfile("demo-user");
    const once = profile.schedule?.intents?.find(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        (row as { cardId?: string }).cardId === "xiaopi_waiting_user",
    ) as { intentId?: string; origin?: string } | undefined;
    expect(once?.origin).toBe("expert_referral");

    const fired = host.advanceClock("demo-user", 5 * 60_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    const outbound = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "xiaopi",
    });
    expect(isEngineError(outbound)).toBe(false);
    if (isEngineError(outbound)) return;
    const call = await host.beginCall("demo-user", outbound, {
      channel: "manual",
    });
    expect(isEngineError(call)).toBe(false);
    if (isEngineError(call)) return;
    expect(call.beginContext).toMatchObject({
      source: "expert_referral",
      topicHint: "露营安全",
      scheduledIntentId: once?.intentId,
    });
    const hard = call.renderedPrompt?.systemHard.join("\n") ?? "";
    expect(hard).toContain("[scheduled.callback.expert_referral]");
    expect(hard).toContain("被介绍/转接后的专家回电");
    expect(hard).not.toContain("用户口头预约的提醒/回电");
  });

  it("澜星 Free 首通使用自由通话开场，不继承打错电话剧情开场", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-free-opening-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    expect(session.beginContext?.source).toBe("free");
    expect(session.renderedPrompt?.openingSpeakable).toBe("喂？我是澜星。");
    expect(session.renderedPrompt?.openingSpeakable).not.toContain("打错");
    expect(session.renderedPrompt?.debug?.notes ?? []).not.toContain(
      "fallback: CharacterDef.defaultPromptScenes",
    );
  });

  it("澜星剧情 opening 留在剧情卡；角色默认兜底不再承载打错电话", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-story-opening-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const storyResolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      chapterId: "wrong_number_act1",
      cardId: "lanxing_wrong_number",
    });
    if (isEngineError(storyResolved)) throw storyResolved;
    const storySession = await host.beginCall("demo-user", storyResolved, {
      channel: "manual",
    });
    if (isEngineError(storySession)) throw storySession;
    expect(storySession.renderedPrompt?.openingSpeakable).toBe("喂？小皮？");
    expect(storySession.renderedPrompt?.matchedLayerIds).toContain(
      "wrong_number_open",
    );

    const host2 = createTestHost({ persist: false, dataRoot });
    await host2.loadWorkspace(dataRoot);
    await host2.ensureProfile("demo-user");
    const fallbackResolved = await host2.resolveAsync("demo-user", {
      kind: "simulate_start",
      chapterId: "wrong_number_act1",
      cardId: "lanxing_callback_intro",
    });
    if (isEngineError(fallbackResolved)) throw fallbackResolved;
    const fallbackSession = await host2.beginCall("demo-user", fallbackResolved, {
      channel: "manual",
    });
    if (isEngineError(fallbackSession)) throw fallbackSession;
    expect(fallbackSession.renderedPrompt?.openingSpeakable).toBe(
      "喂？还是刚才那个电话吗？",
    );

    const host3 = createTestHost({ persist: false, dataRoot });
    await host3.loadWorkspace(dataRoot);
    await host3.ensureProfile("demo-user");
    const freeResolved = await host3.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(freeResolved)) throw freeResolved;
    const freeSession = await host3.beginCall("demo-user", freeResolved, {
      channel: "manual",
    });
    if (isEngineError(freeSession)) throw freeSession;
    expect(freeSession.renderedPrompt?.openingPrivate).not.toContain(
      "打错电话剧情",
    );
    expect(freeSession.renderedPrompt?.openingSpeakable).toBe("喂？我是澜星。");
  });

  it("Free 提醒忽略模型幻觉目标并写入当前自由卡 pending / once", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s3-bad-ref-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "schedule_reminder_call", {
      card_id: "lanxing_free",
      package_id: "2026-Q3",
      delay_minutes: 2,
      topic_hint: "bad ref",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.effectPlanResult?.status).toBe("completed");
    expect(end.effectPlanResult?.results[0]).toMatchObject({
      status: "executed",
    });

    const profile = await host.ensureProfile("demo-user");
    expect(
      profile.callCards.board.byAgent.lanxing?.pending?.some(
        (p) => p.cardId === "lanxing_free" && p.chapterId === FREE_CHAPTER_ID,
      ),
    ).toBe(true);
    expect(
      profile.schedule?.intents?.some(
        (row) =>
          row.kind === "once" &&
          row.cardId === "lanxing_free" &&
          row.chapterId === FREE_CHAPTER_ID,
      ),
    ).toBe(true);
  });
});
