/**
 * V1-E6 / §7.4：end_story 无 next → Host 清场后任意角色 user_dial 命中 Free。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  findActiveStoryLock,
  isEngineError,
  type CallCardDefinition,
} from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("end_story no-next → Free (V1-E6 host)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("清场后任意角色 resolve(user_dial) source===free，旧 story pending 不再命中", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e6-free-"));
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
        activeStoryInstanceId: "inst-e6",
        packageId: "golden_handoff",
        lockLevel: "soft",
        allowedAgentIds: ["lanxing", "xiaopi"],
        blockedPolicy: "allow_with_warning",
        reason: "e6-host-test",
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
    profile.schedule = {
      clockMs: 0,
      intents: [
        {
          kind: "once",
          intentId: "once-e6-old",
          agentId: "xiaopi",
          cardId: "xiaopi_waiting_user",
          packageId: "golden_handoff",
          fireAtMs: 60_000,
          status: "pending",
          linkedInstanceId: "old-story-pending",
        },
      ],
    };

    const beforeDial = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaopi",
    });
    expect(isEngineError(beforeDial)).toBe(false);
    if (isEngineError(beforeDial)) return;
    expect(beforeDial.source).toBe("story_pending");

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

    // 本通 frozenCard 注入无 next 的 end_story（不改磁盘内容）
    const card = session.frozenCard as CallCardDefinition;
    card.exits = [
      {
        exitId: "end_chapter_no_next",
        exitKind: "terminal",
        priority: 200,
        condition: { op: "always" },
        effects: [
          {
            id: "end_no_next",
            effect: "end_story",
            reason: "chapter_done_no_next",
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
    expect(end.selectedExitId).toBe("end_chapter_no_next");

    const after = await host.ensureProfile("demo-user");
    const story = after.stories.golden_handoff as {
      status?: string;
      lock?: unknown;
    };
    expect(story.status).toBe("completed");
    expect(story.lock).toBeNull();
    expect(findActiveStoryLock(after)).toBeNull();
    expect(after.callCards.board.byAgent.xiaopi?.pending ?? []).toEqual([]);
    const once = after.schedule?.intents?.find(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        (row as { intentId?: string }).intentId === "once-e6-old",
    ) as { status?: string };
    expect(once?.status).toBe("cancelled");

    for (const agentId of ["xiaopi", "lanxing"] as const) {
      const dial = await host.resolveAsync("demo-user", {
        kind: "user_dial",
        agentId,
      });
      expect(isEngineError(dial)).toBe(false);
      if (isEngineError(dial)) return;
      expect(dial.source).toBe("free");
      expect(dial.cardId).not.toBe("xiaopi_waiting_user");
    }
  });
});
