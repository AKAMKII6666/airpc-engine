/**
 * 对话惯性持久化：Host 重建后仍能接上一通同角色话茬。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";
import type { CallSession } from "../../src/host/types.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function prepareDataRoot(): Promise<{ tmpRoot: string; dataRoot: string }> {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-inertia-persist-"));
  const dataRoot = path.join(tmpRoot, "data");
  await cp(dataSrc, dataRoot, { recursive: true });
  return { tmpRoot, dataRoot };
}

async function finishFirstCall(dataRoot: string): Promise<CallSession> {
  const host = createTestHost({ persist: true, dataRoot });
  await host.loadWorkspace(dataRoot);
  await host.ensureProfile("demo-user");
  const resolved = await host.resolveAsync("demo-user", {
    kind: "free_call",
    agentId: "lanxing",
  });
  if (isEngineError(resolved)) throw resolved;
  const session = await host.beginCall("demo-user", resolved, {
    channel: "text_turn",
  });
  if (isEngineError(session)) throw session;
  const u1 = host.recordChatTurn(session.sessionId, {
    role: "user",
    text: "刚才说到明天上午九点提醒我带伞。",
  });
  if (isEngineError(u1)) throw u1;
  const a1 = host.recordChatTurn(session.sessionId, {
    role: "assistant",
    text: "好，我会记住这个接续点。",
  });
  if (isEngineError(a1)) throw a1;
  const ended = await host.endCall(session.sessionId, {
    flags: { answered_completed: true },
    completedBeats: [],
    missedRequiredBeats: [],
  });
  if (isEngineError(ended)) throw ended;
  return ended.session;
}

async function beginSecondCall(dataRoot: string): Promise<CallSession> {
  const host = createTestHost({ persist: true, dataRoot });
  await host.loadWorkspace(dataRoot);
  await host.ensureProfile("demo-user");
  const resolved = await host.resolveAsync("demo-user", {
    kind: "free_call",
    agentId: "lanxing",
  });
  if (isEngineError(resolved)) throw resolved;
  const session = await host.beginCall("demo-user", resolved, {
    channel: "text_turn",
  });
  if (isEngineError(session)) throw session;
  return session;
}

describe("conversation inertia persistence", function () {
  let tmpRoot: string | undefined;

  afterEach(async function () {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("restores recent same-agent turns after Host rebuild", async function () {
    const copied = await prepareDataRoot();
    tmpRoot = copied.tmpRoot;
    const first = await finishFirstCall(copied.dataRoot);
    const second = await beginSecondCall(copied.dataRoot);

    expect(second.beginContext?.conversationInertia).toMatchObject({
      previousSessionId: first.sessionId,
      previousCardId: first.resolve.cardId,
      previousSource: "free",
    });
    expect(
      second.beginContext?.conversationInertia?.recentTurns.map(function (turn) {
        return turn.text;
      }),
    ).toEqual(expect.arrayContaining(["刚才说到明天上午九点提醒我带伞。"]));
    expect(second.renderedPrompt.systemHard.join("\n")).toContain(
      "[conversation.inertia]",
    );
  });
});
