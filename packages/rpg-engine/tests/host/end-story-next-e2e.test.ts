/**
 * V1-E7 host：end_story.next 挂入口后，非入口角色走 Free；入口角色可 dial 进下一章。
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  findActiveStoryLock,
  isEngineError,
  type CallCardDefinition,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("end_story next → chapter entry (V1-E7 host)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("wait_user_dial：入口角色 story_pending；其它角色 Free；无 ActiveStoryLock", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e7-next-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    // 复制一章作为 chapter_02，避免 next.packageId === 当前章覆盖 completed
    const srcPkg = path.join(dataRoot, "storis-packages/golden_handoff");
    const dstPkg = path.join(dataRoot, "storis-packages/chapter_02");
    await cp(srcPkg, dstPkg, { recursive: true });
    const confPath = path.join(dstPkg, "story.conf.json");
    const conf = JSON.parse(await readFile(confPath, "utf8")) as {
      packageId?: string;
      title?: string;
    };
    conf.packageId = "chapter_02";
    conf.title = "Chapter 02";
    await writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.characters.xiaoyu = { agentId: "xiaoyu", unlocked: true };
    profile.stories.golden_handoff = {
      packageId: "golden_handoff",
      status: "active",
      variables: {},
      lock: {
        activeStoryInstanceId: "inst-e7",
        packageId: "golden_handoff",
        lockLevel: "soft",
        allowedAgentIds: ["doubao-sister", "xiaoyu"],
        blockedPolicy: "allow_with_warning",
        reason: "e7-host-test",
        startedAt: "2026-07-14T00:00:00.000Z",
      },
    };
    profile.callCards.board.byAgent.xiaoyu = {
      pending: [
        {
          instanceId: "old-pending",
          cardId: "xiaoyu_waiting_user",
          packageId: "golden_handoff",
          agentId: "xiaoyu",
          status: "pending",
          entryMode: "inbound_user_dial",
          createdAt: "2026-07-14T00:00:00.000Z",
        },
      ],
    };

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

    const card = session.frozenCard as CallCardDefinition;
    card.exits = [
      {
        exitId: "end_to_ch2",
        exitKind: "terminal",
        priority: 200,
        condition: { op: "always" },
        effects: [
          {
            id: "end_with_next",
            effect: "end_story",
            reason: "to_chapter_02",
            cleanup: { clearStoryCards: "all", preserveFreeCards: true },
            next: {
              packageId: "chapter_02",
              agentId: "xiaoyu",
              cardId: "xiaoyu_waiting_user",
              activation: "wait_user_dial",
            },
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

    const after = await host.ensureProfile("demo-user");
    expect(
      (after.stories.golden_handoff as { status?: string }).status,
    ).toBe("completed");
    expect(
      (after.stories.chapter_02 as { status?: string }).status,
    ).toBe("inactive");
    expect(
      (after.stories.chapter_02 as { plannedEntry?: { cardId?: string } })
        .plannedEntry?.cardId,
    ).toBe("xiaoyu_waiting_user");
    expect(findActiveStoryLock(after)).toBeNull();

    const entryDial = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaoyu",
    });
    expect(isEngineError(entryDial)).toBe(false);
    if (isEngineError(entryDial)) return;
    expect(entryDial.source).toBe("story_pending");
    expect(entryDial.cardId).toBe("xiaoyu_waiting_user");
    expect(entryDial.packageId).toBe("chapter_02");

    const otherDial = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "doubao-sister",
    });
    expect(isEngineError(otherDial)).toBe(false);
    if (isEngineError(otherDial)) return;
    expect(otherDial.source).toBe("free");
  });
});
