/**
 * S4：playback_only 相位 + completePlayback + 工具策略
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import { seedPlaybackStubCard } from "../helpers/chapterTestFixtures.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

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

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const cardId = await seedPlaybackStubCard(dataRoot);
    await host.loadWorkspace(dataRoot, { resetRuntime: true });
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      chapterId: "golden_handoff",
      cardId,
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;
    expect(session.interactionPhase).toBe("playback");

    const tool = await host.invokeTool(session.sessionId, "register_exit", {
      exit_id: "play_done",
    });
    expect(isEngineError(tool)).toBe(true);

    const afterPlayback = host.completePlayback(session.sessionId);
    if (isEngineError(afterPlayback)) throw afterPlayback;
    expect(afterPlayback.interactionPhase).toBe("dialogue");

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
  });
});
