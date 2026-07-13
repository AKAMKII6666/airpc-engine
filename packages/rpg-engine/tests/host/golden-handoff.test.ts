/**
 * 模块名称：golden_handoff 双通可测（P2）
 * 模块说明：澜星转介 → 小雨 user_dial；断言按需载入与忽略 layout。
 */
import { access, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  isEffectiveDialable,
  isEngineError,
  CharacterDefSchema,
  PlayerProfileSchema,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("golden_handoff", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("layout sidecar exists on disk but is never required by engine", async () => {
    const layoutPath = path.join(
      dataSrc,
      "storis-packages/golden_handoff/canvas.layout.json",
    );
    await access(layoutPath);

    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p2-layout-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    // 删掉 layout 旁车，引擎仍应能 loadWorkspace + 按需载卡
    await rm(
      path.join(
        dataRoot,
        "storis-packages/golden_handoff/canvas.layout.json",
      ),
      { force: true },
    );

    const host = createEngineHost({ persist: false });
    await host.loadWorkspace(dataRoot);
    expect(host.getLoadedCardCount("golden_handoff")).toBe(0);

    const pre = await host.preloadCard(
      "golden_handoff",
      "doubao_intro_outbound",
    );
    expect(pre && isEngineError(pre)).toBeFalsy();
    expect(host.getLoadedCardCount("golden_handoff")).toBe(1);
  });

  it("full handoff: 澜星 success → 小雨 user_dial → meet_ok unmount", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-p2-golden-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");

    const xiaoyuDef = CharacterDefSchema.parse(
      JSON.parse(
        await readFile(path.join(dataRoot, "characters/xiaoyu.json"), "utf8"),
      ),
    );
    expect(isEffectiveDialable(xiaoyuDef, profile)).toBe(false);

    // —— 通 1：澜星 simulate_start ——
    expect(host.getLoadedCardCount("golden_handoff")).toBe(0);
    const r1 = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    if (isEngineError(r1)) throw r1;
    expect(host.getLoadedCardCount("golden_handoff")).toBe(1);

    const s1 = host.beginCall("demo-user", r1, { channel: "manual" });
    if (isEngineError(s1)) throw s1;

    const e1 = await host.endCall(s1.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["user_knows_to_call_xiaoyu"],
      missedRequiredBeats: [],
    });
    if (isEngineError(e1)) throw e1;
    expect(e1.selectedExitId).toBe("success_handoff");

    const after1 = await host.ensureProfile("demo-user");
    expect(after1.characters.xiaoyu?.unlocked).toBe(true);
    expect(isEffectiveDialable(xiaoyuDef, after1)).toBe(true);
    expect(after1.telephony?.redialSlot?.cardId).toBe("xiaoyu_waiting_user");

    // 未解锁前不可拨（用初始 profile 快照已测）；再测错误码路径：
    // 临时把 unlocked 关掉验证 CHARACTER_NOT_DIALABLE
    after1.characters.xiaoyu!.unlocked = false;
    const blocked = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaoyu",
    });
    expect(isEngineError(blocked)).toBe(true);
    if (isEngineError(blocked)) {
      expect(blocked.code).toBe("CHARACTER_NOT_DIALABLE");
    }
    after1.characters.xiaoyu!.unlocked = true;

    // —— 通 2：小雨 user_dial ——
    const r2 = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaoyu",
    });
    if (isEngineError(r2)) throw r2;
    expect(r2.source).toBe("story_pending");
    expect(r2.cardId).toBe("xiaoyu_waiting_user");
    expect(host.getLoadedCardCount("golden_handoff")).toBe(2);

    const s2 = host.beginCall("demo-user", r2, {
      channel: "manual",
      localNowIso: "2026-07-13T17:00:00+08:00",
    });
    if (isEngineError(s2)) throw s2;
    expect(s2.composeScene.callDirection).toBe("inbound");
    expect(s2.frozenCard.cardId).toBe("xiaoyu_waiting_user");

    const e2 = await host.endCall(s2.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["first_hello_done"],
      missedRequiredBeats: [],
    });
    if (isEngineError(e2)) throw e2;
    expect(e2.selectedExitId).toBe("meet_ok");

    const after2 = await host.ensureProfile("demo-user");
    const pending = after2.callCards.board.byAgent.xiaoyu?.pending ?? [];
    expect(
      pending.some(function (p) {
        return p.cardId === "xiaoyu_waiting_user" && p.status === "pending";
      }),
    ).toBe(false);

    // 存档仍不含 CallSession
    const disk = PlayerProfileSchema.parse(
      JSON.parse(
        await readFile(
          path.join(dataRoot, "users/demo-user/profile.save.json"),
          "utf8",
        ),
      ),
    );
    expect(JSON.stringify(disk)).not.toContain(s1.sessionId);
    expect(JSON.stringify(disk)).not.toContain(s2.sessionId);
  });
});
