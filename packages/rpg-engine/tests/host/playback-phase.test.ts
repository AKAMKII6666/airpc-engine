/**
 * S4：playback_only 相位 + completePlayback + 工具策略
 */
import { cp, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  isEngineError,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("playback_only session (S4)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("beginCall → phase=playback；禁 register_exit；completePlayback → endCall", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s4-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const pkgDir = path.join(dataRoot, "storis-packages", "golden_handoff");
    const cardId = "playback_stub";
    await writeFile(
      path.join(pkgDir, "cards", `${cardId}.s-card.json`),
      JSON.stringify(
        {
          cardId,
          cardKind: "story",
          title: "播放桩",
          ownerAgentId: "doubao-sister",
          entryMode: "outbound_auto",
          interactionMode: "hybrid",
          context: {
            playbackClipId: "clip_hello",
            privateBrief: "",
            speakableBrief: "播放中",
          },
          objectives: { requiredBeats: [] },
          toolPolicy: {
            mode: "allowlist",
            allowedToolIds: ["share_expert_number"],
          },
          exits: [
            {
              exitId: "play_done",
              exitKind: "terminal",
              title: "播完",
              priority: 100,
              condition: { op: "always" },
              effects: [],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    const confPath = path.join(pkgDir, "story.conf.json");
    const conf = JSON.parse(await readFile(confPath, "utf8")) as {
      cards: Array<{ cardId: string }>;
    };
    conf.cards.push({ cardId });
    await writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot, { resetRuntime: true });
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId,
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    expect(session.interactionPhase).toBe("playback");
    expect(session.playback?.clipId).toBe("clip_hello");
    expect(session.playback?.resolved).toBe(true);

    const blocked = await host.invokeTool(
      session.sessionId,
      "share_expert_number",
      { target_agent_id: "xiaoyu" },
    );
    expect(isEngineError(blocked)).toBe(true);
    if (isEngineError(blocked)) {
      expect(blocked.message).toContain("playback");
    }

    const afterPlay = host.completePlayback(session.sessionId);
    expect(isEngineError(afterPlay)).toBe(false);
    if (isEngineError(afterPlay)) return;
    expect(afterPlay.phoneFlags.playback_completed).toBe(true);
    expect(afterPlay.interactionPhase).toBe("dialogue");

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true, playback_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
  });
});
