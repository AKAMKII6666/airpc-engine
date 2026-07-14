/**
 * 模块名称：Manual Story 闭环集成测（读 data/，不写回）
 */
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  isEngineError,
  type PlayerProfile,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("manual story loop", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("simulate_start → Manual Outcome → unlock/attach/redial → saveProfile", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p1-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    expect(isEngineError(resolved)).toBe(false);
    if (isEngineError(resolved)) return;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
      localNowIso: "2026-07-13T16:00:00+08:00",
      timeZone: "Asia/Shanghai",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;
    expect(session.composeScene.callDirection).toBe("outbound");
    expect(session.composeScene.localTime.bucket).toBe("afternoon");
    expect(session.matchedLayerIds).toEqual(
      expect.arrayContaining(["outbound_any", "outbound_afternoon"]),
    );
    expect(session.renderedPrompt?.openingSpeakable).toContain("下午");
    expect(
      session.renderedPrompt?.systemHard.some((s) =>
        s.includes("[用户本地时间]"),
      ),
    ).toBe(true);
    expect(session.status).toBe("in_call");

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["user_knows_to_call_xiaoyu"],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.selectedExitId).toBe("success_handoff");
    expect(end.session.status).toBe("completed");
    expect(host.getActiveSession("demo-user")).toBeNull();

    const saved = JSON.parse(
      await readFile(
        path.join(dataRoot, "users/demo-user/profile.save.json"),
        "utf8",
      ),
    ) as PlayerProfile;

    expect(saved.characters.xiaoyu?.unlocked).toBe(true);
    expect(saved.telephony?.redialSlot?.agentId).toBe("xiaoyu");
    expect(saved.telephony?.redialSlot?.cardId).toBe("xiaoyu_waiting_user");
    const pending = saved.callCards.board.byAgent.xiaoyu?.pending ?? [];
    expect(pending.some((p) => p.cardId === "xiaoyu_waiting_user")).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(session.sessionId);
  });

  it("rejects second beginCall while active", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p1-mutex-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    if (isEngineError(resolved)) throw resolved;

    const first = await host.beginCall("demo-user", resolved, { channel: "manual" });
    if (isEngineError(first)) throw first;

    const second = await host.beginCall("demo-user", resolved, { channel: "manual" });
    expect(isEngineError(second)).toBe(true);
    if (isEngineError(second)) {
      expect(second.code).toBe("CONFLICT_ACTIVE_CALL");
    }
  });
});
