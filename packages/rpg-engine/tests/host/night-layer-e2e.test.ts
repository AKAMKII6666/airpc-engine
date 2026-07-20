/**
 * E4d：同卡 outbound + night／late_night 层；改 localNowIso 命中
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

describe("E4d night／late_night layer", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  async function beginIntroAt(localNowIso: string) {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4d-night-"));
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

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
      localNowIso,
      timeZone: "Asia/Shanghai",
    });
    if (isEngineError(session)) throw session;
    return { host, session };
  }

  it("night localNowIso hits outbound_night + local time hard block", async () => {
    const { host, session } = await beginIntroAt("2026-07-13T22:30:00+08:00");
    expect(session.composeScene.callDirection).toBe("outbound");
    expect(session.composeScene.localTime.localHour).toBe(22);
    expect(session.matchedLayerIds).toEqual(
      expect.arrayContaining(["outbound_any", "outbound_night"]),
    );
    expect(session.matchedLayerIds).not.toContain("outbound_late_night");
    expect(session.matchedLayerIds).not.toContain("outbound_afternoon");
    expect(session.renderedPrompt?.openingSpeakable).toContain("这么晚");
    expect(
      session.renderedPrompt?.systemHard.some((s) =>
        s.includes("[用户本地时间]"),
      ),
    ).toBe(true);
    expect(
      session.renderedPrompt?.systemHard.some((s) =>
        s.includes("22:30:00+08:00"),
      ),
    ).toBe(true);

    await host.endCall(session.sessionId, {
      flags: { hangup_early: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
  });

  it("late_night localNowIso hits outbound_late_night", async () => {
    const { host, session } = await beginIntroAt("2026-07-14T02:15:00+08:00");
    expect(session.composeScene.localTime.localHour).toBe(2);
    expect(session.matchedLayerIds).toEqual(
      expect.arrayContaining(["outbound_any", "outbound_late_night"]),
    );
    expect(session.matchedLayerIds).not.toContain("outbound_night");
    expect(session.renderedPrompt?.openingSpeakable).toContain("还醒着");
    expect(
      session.renderedPrompt?.systemHard.some((s) =>
        s.includes("02:15:00+08:00"),
      ),
    ).toBe(true);

    await host.endCall(session.sessionId, {
      flags: { hangup_early: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
  });
});
