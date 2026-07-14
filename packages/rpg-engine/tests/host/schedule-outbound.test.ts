/**
 * S3：schedule_call_card → advanceClock → agent_outbound begin
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  isEngineError,
} from "../../src/index.js";
import { expandRegisterExitEffects } from "../../src/tools/expandExitEffects.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("schedule → outbound (S3)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("expand 拒绝仅 topicHint 的 schedule / refer", () => {
    const badRefer = expandRegisterExitEffects(
      "refer_to_expert",
      { target_agent_id: "xiaoyu", topic_hint: "hello" },
      "doubao-sister",
    );
    expect(isEngineError(badRefer)).toBe(true);

    const badRemind = expandRegisterExitEffects(
      "schedule_reminder_call",
      { topic_hint: "only hint", delay_minutes: 1 },
      "doubao-sister",
    );
    expect(isEngineError(badRemind)).toBe(true);

    const ok = expandRegisterExitEffects(
      "schedule_reminder_call",
      {
        card_id: "doubao_intro_outbound",
        package_id: "golden_handoff",
        delay_minutes: 1,
        topic_hint: "ok",
      },
      "doubao-sister",
    );
    expect(isEngineError(ok)).toBe(false);
    if (isEngineError(ok)) return;
    expect(ok[0]?.effect).toBe("schedule_call_card");
    expect(ok[0]?.cardId).toBe("doubao_intro_outbound");
  });

  it("Free 挂机写入 schedule → advanceClock → agent_outbound begin Manual", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s3-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "doubao-sister",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "schedule_reminder_call", {
      card_id: "doubao_intro_outbound",
      package_id: "golden_handoff",
      delay_minutes: 10,
      topic_hint: "followup",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;

    const profile = await host.ensureProfile("demo-user");
    const once = profile.schedule?.intents?.find(function (row) {
      return (
        row !== null &&
        typeof row === "object" &&
        (row as { kind?: string }).kind === "once"
      );
    }) as { cardId?: string; fireAtMs?: number } | undefined;
    expect(once?.cardId).toBe("doubao_intro_outbound");

    const fired = host.advanceClock("demo-user", 10 * 60_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(fired.some((f) => f.cardId === "doubao_intro_outbound")).toBe(true);

    const outbound = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "doubao-sister",
    });
    expect(isEngineError(outbound)).toBe(false);
    if (isEngineError(outbound)) return;
    expect(outbound.source).toBe("story_pending");
    expect(outbound.cardId).toBe("doubao_intro_outbound");

    const call2 = await host.beginCall("demo-user", outbound, {
      channel: "manual",
    });
    expect(isEngineError(call2)).toBe(false);
    if (isEngineError(call2)) return;
    expect(call2.status).toBe("in_call");
  });
});
