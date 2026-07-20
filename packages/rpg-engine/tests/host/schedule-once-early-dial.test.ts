/**
 * V1-E4 / V1-E5：schedule_call_card 立即挂 pending + linked once；
 * 提前呼入消费；正常外呼 actualEntry；防重复 tick。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEngineHost, isEngineError } from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("schedule_call_card linked pending + early dial (V1-E4/E5)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  async function scheduleXiaoyuFollowup() {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-once-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    delete profile.characters.xiaoyu;
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent.xiaoyu = { pending: [] };
    }
    profile.schedule = { clockMs: 0, intents: [] };

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "doubao-sister",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "refer_to_expert", {
      target_agent_id: "xiaoyu",
      card_id: "xiaoyu_waiting_user",
      package_id: "golden_handoff",
      topic_hint: "followup",
      delay_minutes: 5,
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) throw inv;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) throw end;

    return host;
  }

  it("挂机后立即挂 either pending，once 带 linkedInstanceId", async () => {
    const host = await scheduleXiaoyuFollowup();
    const profile = await host.ensureProfile("demo-user");
    const pending =
      profile.callCards.board.byAgent.xiaoyu?.pending.find(
        (p) =>
          p.cardId === "xiaoyu_waiting_user" && p.status === "pending",
      );
    expect(pending).toBeTruthy();
    expect(pending?.entryMode).toBe("either");
    expect(pending?.activationHint).toBe("outbound_auto");
    expect(pending?.scheduledIntentId).toBeTruthy();

    const once = profile.schedule?.intents?.find(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        (row as { kind?: string }).kind === "once" &&
        (row as { cardId?: string }).cardId === "xiaoyu_waiting_user",
    ) as {
      linkedInstanceId?: string;
      status?: string;
      agentId?: string;
      packageId?: string;
    };
    expect(once?.status).toBe("pending");
    expect(once?.agentId).toBe("xiaoyu");
    expect(once?.packageId).toBe("golden_handoff");
    expect(once?.linkedInstanceId).toBe(pending?.instanceId);
  });

  it("用户提前呼入：actualEntry=inbound_user_dial，once→consumed，tick 不重复外呼", async () => {
    const host = await scheduleXiaoyuFollowup();

    const dial = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaoyu",
    });
    expect(isEngineError(dial)).toBe(false);
    if (isEngineError(dial)) return;
    expect(dial.source).toBe("story_pending");
    expect(dial.cardId).toBe("xiaoyu_waiting_user");

    const call = await host.beginCall("demo-user", dial, {
      channel: "manual",
    });
    expect(isEngineError(call)).toBe(false);
    if (isEngineError(call)) return;
    expect(call.actualEntry).toBe("inbound_user_dial");
    expect(call.composeScene.callDirection).toBe("inbound");

    const mid = await host.ensureProfile("demo-user");
    const once = mid.schedule?.intents?.find(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        (row as { kind?: string }).kind === "once" &&
        (row as { cardId?: string }).cardId === "xiaoyu_waiting_user",
    ) as { status?: string };
    expect(once?.status).toBe("consumed");

    await host.endCall(call.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["first_hello_done"],
      missedRequiredBeats: [],
    });

    const fired = host.advanceClock("demo-user", 5 * 60_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(
      fired.filter((f) => f.cardId === "xiaoyu_waiting_user"),
    ).toHaveLength(0);

    const after = await host.ensureProfile("demo-user");
    const stillPending =
      after.callCards.board.byAgent.xiaoyu?.pending.filter(
        (p) =>
          p.cardId === "xiaoyu_waiting_user" && p.status === "pending",
      ) ?? [];
    expect(stillPending).toHaveLength(0);
  });

  it("定时外呼：actualEntry=outbound_auto，命中同一 linked pending", async () => {
    const host = await scheduleXiaoyuFollowup();
    const before = await host.ensureProfile("demo-user");
    const linkedId = before.callCards.board.byAgent.xiaoyu?.pending.find(
      (p) => p.cardId === "xiaoyu_waiting_user",
    )?.instanceId;

    const fired = host.advanceClock("demo-user", 5 * 60_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(fired.some((f) => f.cardId === "xiaoyu_waiting_user")).toBe(true);
    expect(fired[0]?.instanceId).toBe(linkedId);

    const outbound = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "xiaoyu",
    });
    expect(isEngineError(outbound)).toBe(false);
    if (isEngineError(outbound)) return;
    expect(outbound.source).toBe("story_pending");
    expect(outbound.instanceId).toBe(linkedId);

    const call = await host.beginCall("demo-user", outbound, {
      channel: "manual",
    });
    expect(isEngineError(call)).toBe(false);
    if (isEngineError(call)) return;
    expect(call.actualEntry).toBe("outbound_auto");
    expect(call.composeScene.callDirection).toBe("outbound");
  });
});
