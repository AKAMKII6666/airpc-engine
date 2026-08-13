import { describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import { withCopiedDataHost } from "../helpers/copiedDataHost.js";

describe("EngineHost consumeOpeningFirstTurn", function () {
  it("emits direct inbound opening, records assistant turn, and is idempotent", async () => {
    const ctx = await withCopiedDataHost();
    try {
      await ctx.host.ensureProfile("demo-user");
      const resolved = await ctx.host.resolveAsync("demo-user", {
        kind: "free_call",
        agentId: "lanxing",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await ctx.host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const first = ctx.host.consumeOpeningFirstTurn(session.sessionId);
      if (isEngineError(first)) throw first;

      expect(first).toMatchObject({
        ok: true,
        action: "emit_assistant_turn",
        text: "喂？请问哪位？",
        source: "opening_first_turn_gate",
      });
      expect(first.session.openingFirstTurn).toMatchObject({
        status: "emitted",
        mode: "direct_opening",
        llmContextPolicy: {
          includeSoftContext: false,
          includeMemory: false,
          includeInertia: false,
        },
      });
      expect(first.session.chatTurns).toEqual([
        expect.objectContaining({
          role: "assistant",
          text: "喂？请问哪位？",
        }),
      ]);

      const second = ctx.host.consumeOpeningFirstTurn(session.sessionId);
      if (isEngineError(second)) throw second;
      expect(second).toMatchObject({
        ok: true,
        action: "already_emitted",
      });
      expect(second.session.chatTurns).toHaveLength(1);
    } finally {
      await ctx.cleanup();
    }
  });

  it("returns request_llm_opening for scheduled outbound without recording a turn", async () => {
    const ctx = await withCopiedDataHost();
    try {
      await ctx.host.ensureProfile("demo-user");
      const inbound = await ctx.host.resolveAsync("demo-user", {
        kind: "free_call",
        agentId: "lanxing",
      });
      if (isEngineError(inbound)) throw inbound;
      const session = await ctx.host.beginCall("demo-user", inbound, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;
      const inv = await ctx.host.invokeTool(session.sessionId, "schedule_reminder_call", {
        delay_minutes: 10,
        topic_hint: "followup",
      });
      if (isEngineError(inv)) throw inv;
      const end = await ctx.host.endCall(session.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });
      if (isEngineError(end)) throw end;
      const fired = ctx.host.advanceClock("demo-user", 10 * 60_000);
      if (isEngineError(fired)) throw fired;
      const outbound = await ctx.host.resolveAsync("demo-user", {
        kind: "agent_outbound",
        agentId: "lanxing",
      });
      if (isEngineError(outbound)) throw outbound;
      const call = await ctx.host.beginCall("demo-user", outbound, {
        channel: "manual",
      });
      if (isEngineError(call)) throw call;

      const result = ctx.host.consumeOpeningFirstTurn(call.sessionId);
      if (isEngineError(result)) throw result;

      expect(result).toMatchObject({
        ok: true,
        action: "request_llm_opening",
        source: "opening_first_turn_gate",
      });
      expect(result.session.openingFirstTurn).toMatchObject({
        status: "pending",
        mode: "llm_opening",
        llmContextPolicy: {
          includeSoftContext: true,
          includeMemory: true,
          includeInertia: true,
        },
      });
      expect(result.session.chatTurns ?? []).toHaveLength(0);
    } finally {
      await ctx.cleanup();
    }
  });
});
