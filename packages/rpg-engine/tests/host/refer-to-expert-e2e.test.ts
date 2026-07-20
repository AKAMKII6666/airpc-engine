/**
 * E4a：refer_to_expert 整通 — invokeTool → endCall → unlock + schedule／pending
 */
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
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

describe("E4a refer_to_expert E2E", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("invokeTool(refer_to_expert) → endCall → unlock + schedule → advanceClock pending", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4a-refer-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    // 种子存档可能已解锁／有 inbound pending；本测断言 refer 整通写入
    delete profile.characters.xiaoyu;
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent.xiaoyu = { pending: [] };
    }
    if (profile.telephony) {
      delete profile.telephony.redialSlot;
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
      topic_hint: "澜星引荐",
      delay_minutes: 5,
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;
    expect(inv.behavior).toBe("register_exit");
    expect(session.exitCandidates).toHaveLength(1);
    expect(session.exitCandidates[0]?.toolId).toBe("refer_to_expert");
    expect(
      session.exitCandidates[0]?.effects.map((e) => e.effect),
    ).toEqual(["set_character_unlocked", "schedule_call_card"]);

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.selectedExitId).toBeTruthy();
    expect(
      end.effectPlanResult.results.some((r) => r.status === "executed"),
    ).toBe(true);

    const saved = JSON.parse(
      await readFile(
        path.join(dataRoot, "users/demo-user/profile.save.json"),
        "utf8",
      ),
    ) as {
      characters: Record<string, { unlocked?: boolean }>;
      schedule?: {
        clockMs?: number;
        intents?: Array<{
          kind?: string;
          agentId?: string;
          cardId?: string;
          packageId?: string;
          status?: string;
          fireAtMs?: number;
        }>;
      };
    };

    expect(saved.characters.xiaoyu?.unlocked).toBe(true);
    const once = saved.schedule?.intents?.find(
      (row) =>
        row?.kind === "once" &&
        row.agentId === "xiaoyu" &&
        row.cardId === "xiaoyu_waiting_user",
    );
    expect(once).toBeTruthy();
    expect(once?.packageId).toBe("golden_handoff");
    expect(once?.status).toBe("pending");
    expect(typeof once?.fireAtMs).toBe("number");

    const fired = host.advanceClock("demo-user", 5 * 60_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(
      fired.some(
        (f) =>
          f.agentId === "xiaoyu" && f.cardId === "xiaoyu_waiting_user",
      ),
    ).toBe(true);

    const afterTick = await host.ensureProfile("demo-user");
    const pending =
      afterTick.callCards.board.byAgent.xiaoyu?.pending ?? [];
    expect(
      pending.some(
        (p) =>
          p.cardId === "xiaoyu_waiting_user" &&
          p.status === "pending" &&
          (p.entryMode === "either" || p.entryMode === "outbound_auto"),
      ),
    ).toBe(true);

    const outbound = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "xiaoyu",
    });
    expect(isEngineError(outbound)).toBe(false);
    if (isEngineError(outbound)) return;
    expect(outbound.source).toBe("story_pending");
    expect(outbound.cardId).toBe("xiaoyu_waiting_user");
  });
});
