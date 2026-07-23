/**
 * 模块名称：ActiveStoryLock Resolver 读闸（T1）
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  isEngineError,
  releaseStoryLock,
  type ActiveStoryLock,
} from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

function hardRejectLock(overrides?: Partial<ActiveStoryLock>): ActiveStoryLock {
  return {
    activeStoryInstanceId: "story-inst-1",
    packageId: "golden_handoff",
    lockLevel: "hard",
    allowedAgentIds: ["lanxing"],
    blockedPolicy: "reject_call",
    reason: "test hard lock",
    startedAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("ActiveStoryLock resolver gate", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("hard reject_call blocks dial outside allowedAgentIds (STORY_LOCKED)", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-t1-lock-"));
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
      lock: hardRejectLock(),
    };

    const blocked = host.resolve("demo-user", {
      kind: "user_dial",
      agentId: "xiaopi",
    });
    expect(isEngineError(blocked)).toBe(true);
    if (isEngineError(blocked)) {
      expect(blocked.code).toBe("STORY_LOCKED");
    }
  });

  it("releaseStoryLock clears gate so dial can proceed", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-t1-unlock-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.characters.xiaopi = { agentId: "xiaopi", unlocked: true };
    // 清 pending，避免未预载卡干扰读闸断言
    profile.callCards.board.byAgent = {};
    profile.stories.golden_handoff = {
      packageId: "golden_handoff",
      status: "active",
      variables: {},
      lock: hardRejectLock(),
    };

    const blocked = host.resolve("demo-user", {
      kind: "user_dial",
      agentId: "xiaopi",
    });
    expect(isEngineError(blocked)).toBe(true);
    if (isEngineError(blocked)) {
      expect(blocked.code).toBe("STORY_LOCKED");
    }

    releaseStoryLock(profile, "golden_handoff");
    const opened = host.resolve("demo-user", {
      kind: "user_dial",
      agentId: "xiaopi",
    });
    expect(isEngineError(opened)).toBe(false);
    if (!isEngineError(opened)) {
      expect(opened.source).toBe("free");
    }
  });

  it("beginCall activates StorySave; simulate_start bypasses lock gate", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-t1-begin-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.stories.other_pkg = {
      packageId: "other_pkg",
      status: "active",
      variables: {},
      lock: hardRejectLock({
        packageId: "other_pkg",
        allowedAgentIds: ["nobody"],
      }),
    };

    const sim = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    expect(isEngineError(sim)).toBe(false);
    if (isEngineError(sim)) return;

    const session = await host.beginCall("demo-user", sim, {
      channel: "manual",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;

    const story = profile.stories.golden_handoff as {
      status?: string;
      packageId?: string;
    };
    expect(story?.status).toBe("active");
    expect(story?.packageId).toBe("golden_handoff");
  });
});
