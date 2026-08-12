/**
 * 模块名称：Host Prompt Trace Golden
 * 模块说明：从真实 Host beginCall 锁住 BeginCallContext → Composer Provider 的整线摘要。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  FREE_CHAPTER_ID,
  isEngineError,
  type CallSession,
  type EngineHost,
} from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");
const tmpRoots: string[] = [];

afterEach(async () => {
  while (tmpRoots.length > 0) {
    const root = tmpRoots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

type HostFixture = {
  /** Host under test */
  host: EngineHost;
  /** Copied data root backing fs ports */
  dataRoot: string;
};

async function createHostFixture(
  opts: { persist?: boolean } = {},
): Promise<HostFixture> {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-prompt-golden-"));
  tmpRoots.push(tmpRoot);
  const dataRoot = path.join(tmpRoot, "data");
  await cp(dataSrc, dataRoot, { recursive: true });
  const host = createTestHost({ persist: opts.persist ?? false, dataRoot });
  await host.loadWorkspace(dataRoot);
  const profile = await host.ensureProfile("demo-user");
  profile.callCards.board.byAgent.xiaopi = { pending: [] };
  profile.schedule = { clockMs: 0, intents: [] };
  return { host, dataRoot };
}

async function createHost(): Promise<EngineHost> {
  return (await createHostFixture()).host;
}

function blockTitles(session: CallSession): string[] {
  return session.renderedPrompt.systemHard.map(function (block) {
    const firstLine = block.split("\n")[0] ?? "";
    const match = firstLine.match(/^\[([^\]]+)\]/);
    return match?.[1] ?? firstLine;
  });
}

function traceSummary(session: CallSession) {
  return {
    source: session.beginContext?.source,
    actualEntry: session.beginContext?.actualEntry,
    topicHint: session.beginContext?.topicHint ?? null,
    opening: session.renderedPrompt.openingSpeakable ?? null,
    matchedLayerIds: session.renderedPrompt.matchedLayerIds,
    providerIds: session.renderedPrompt.debug?.providerIds ?? [],
    systemHardTitles: blockTitles(session),
    softContextTitles: session.renderedPrompt.softContext.map(function (block) {
      const firstLine = block.split("\n")[0] ?? "";
      const match = firstLine.match(/^\[([^\]]+)\]/);
      return match?.[1] ?? firstLine;
    }),
  };
}

async function beginFreeCall(host: EngineHost): Promise<CallSession> {
  const resolved = await host.resolveAsync("demo-user", {
    kind: "free_call",
    agentId: "lanxing",
  });
  if (isEngineError(resolved)) throw resolved;
  const session = await host.beginCall("demo-user", resolved, {
    channel: "manual",
  });
  if (isEngineError(session)) throw session;
  return session;
}

async function endCompleted(host: EngineHost, session: CallSession): Promise<void> {
  const ended = await host.endCall(session.sessionId, {
    flags: { answered_completed: true },
    completedBeats: [],
    missedRequiredBeats: [],
  });
  if (isEngineError(ended)) throw ended;
}

describe("Host prompt trace golden", () => {
  it("free lanxing call starts from free card prompt providers", async () => {
    const host = await createHost();
    const session = await beginFreeCall(host);

    expect(traceSummary(session)).toMatchInlineSnapshot(`
      {
        "actualEntry": "inbound_user_dial",
        "matchedLayerIds": [
          "lanxing_free_inbound_style",
        ],
        "opening": "喂？请问哪位？",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "conversation.inertia.recent_turns",
          "identity",
          "lore source=fallback",
          "tools",
        ],
        "source": "free",
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "forbidden",
          "emotion",
          "toneHint",
          "style.phone",
          "call.source",
          "conversation.inertia",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
        "topicHint": null,
      }
    `);
    expect(session.renderedPrompt.openingSpeakable).not.toContain("打错");
    expect(session.chapterId).toBe(FREE_CHAPTER_ID);
  });

  it("scheduled reminder callback trace keeps callback topic", async () => {
    const host = await createHost();
    const first = await beginFreeCall(host);
    const invoked = await host.invokeTool(first.sessionId, "schedule_reminder_call", {
      delay_minutes: 3,
      topic_hint: "提醒喝水",
    });
    if (isEngineError(invoked)) throw invoked;
    await endCompleted(host, first);

    const fired = host.advanceClock("demo-user", 3 * 60_000);
    if (isEngineError(fired)) throw fired;
    const resolved = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const callback = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(callback)) throw callback;

    expect(traceSummary(callback)).toMatchInlineSnapshot(`
      {
        "actualEntry": "outbound_auto",
        "matchedLayerIds": [
          "lanxing_free_outbound_default",
        ],
        "opening": "喂，是我。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "conversation.inertia.recent_turns",
          "identity",
          "lore source=fallback",
          "tools",
        ],
        "source": "schedule_reminder",
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "forbidden",
          "emotion",
          "toneHint",
          "style.phone",
          "call.source",
          "conversation.inertia",
          "scheduled.callback.user_reminder",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
        "topicHint": "提醒喝水",
      }
    `);
    expect(callback.renderedPrompt.systemHard.join("\n\n")).toContain(
      "回电话题：提醒喝水",
    );
  });

  it("missed expert callback trace includes missed outbound provider", async () => {
    const host = await createHost();
    const first = await beginFreeCall(host);
    const invoked = await host.invokeTool(first.sessionId, "refer_to_expert", {
      target_agent_id: "xiaopi",
      card_id: "xiaopi_waiting_user",
      package_id: "golden_handoff",
      topic_hint: "电脑坏了",
      delay_minutes: 2,
    });
    if (isEngineError(invoked)) throw invoked;
    await endCompleted(host, first);

    const fired = host.advanceClock("demo-user", 2 * 60_000);
    if (isEngineError(fired)) throw fired;
    const [incoming] = host.listIncomingCallEvents("demo-user");
    expect(incoming).toBeTruthy();
    const dismissed = host.dismissIncomingCallEvent(
      "demo-user",
      incoming!.eventId,
      "dismissed",
    );
    if (isEngineError(dismissed)) throw dismissed;
    const resolved = await host.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaopi",
    });
    if (isEngineError(resolved)) throw resolved;
    const callback = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(callback)) throw callback;

    expect(traceSummary(callback)).toMatchInlineSnapshot(`
      {
        "actualEntry": "inbound_user_dial",
        "matchedLayerIds": [],
        "opening": "喂，是我。刚才那通没接上。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "identity",
          "lore source=fallback",
        ],
        "source": "expert_referral",
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "forbidden",
          "emotion",
          "style.phone",
          "call.source",
          "call.missed_outbound",
          "scheduled.callback.expert_referral",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
        "topicHint": "电脑坏了",
      }
    `);
    expect(callback.beginContext?.isMissedOutbound).toBe(true);
    expect(callback.renderedPrompt.systemHard.join("\n\n")).toContain(
      "missedReason=dismissed",
    );
  });

  it("persisted missed expert callback keeps missed prompt after host reload", async () => {
    const fixture = await createHostFixture({ persist: true });
    const first = await beginFreeCall(fixture.host);
    const invoked = await fixture.host.invokeTool(first.sessionId, "refer_to_expert", {
      target_agent_id: "xiaopi",
      card_id: "xiaopi_waiting_user",
      package_id: "golden_handoff",
      topic_hint: "电脑坏了",
      delay_minutes: 2,
    });
    if (isEngineError(invoked)) throw invoked;
    await endCompleted(fixture.host, first);

    const fired = fixture.host.advanceClock("demo-user", 2 * 60_000);
    if (isEngineError(fired)) throw fired;
    const [incoming] = fixture.host.listIncomingCallEvents("demo-user");
    expect(incoming).toBeTruthy();
    const dismissed = fixture.host.dismissIncomingCallEvent(
      "demo-user",
      incoming!.eventId,
      "rejected",
    );
    if (isEngineError(dismissed)) throw dismissed;
    await fixture.host.saveProfile("demo-user", "autosave");

    const reloadedHost = createTestHost({
      persist: true,
      dataRoot: fixture.dataRoot,
    });
    await reloadedHost.loadWorkspace(fixture.dataRoot);
    await reloadedHost.ensureProfile("demo-user");
    const resolved = await reloadedHost.resolveAsync("demo-user", {
      kind: "user_dial",
      agentId: "xiaopi",
    });
    if (isEngineError(resolved)) throw resolved;
    const callback = await reloadedHost.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(callback)) throw callback;

    expect(traceSummary(callback)).toMatchInlineSnapshot(`
      {
        "actualEntry": "inbound_user_dial",
        "matchedLayerIds": [],
        "opening": "喂，是我。刚才那通没接上。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "identity",
          "lore source=fallback",
        ],
        "source": "expert_referral",
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "forbidden",
          "emotion",
          "style.phone",
          "call.source",
          "call.missed_outbound",
          "scheduled.callback.expert_referral",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
        "topicHint": "电脑坏了",
      }
    `);
    expect(callback.beginContext?.missedOutbound?.reason).toBe("rejected");
    expect(callback.renderedPrompt.systemHard.join("\n\n")).toContain(
      "missedReason=rejected",
    );
  });
});
