/**
 * V1-E9 / 增强计划 §7.1–7.3 回归：
 * - 7.1 recurring 禁裸 + ScheduleCard 可 resolve outbound
 * - 7.2 剧情延迟外呼 schedule_call_card → advanceClock → beginCall
 * - 7.3 提前呼入消费 + 正常 outbound 路径
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  hasBlockingErrors,
  isEngineError,
  SCHEDULE_PACKAGE_ID,
} from "../../src/index.js";
import { expandRegisterExitEffects } from "../../src/tools/expandExitEffects.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("引擎 §7.1–7.3 回归 (V1-E9)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  describe("§7.1 recurring 不允许裸任务", () => {
    it("schedule_recurring_call 缺 scheduleCardId/cardId → expand error", () => {
      const bare = expandRegisterExitEffects(
        "schedule_recurring_call",
        { topic_hint: "bare", hour: 9, minute: 0 },
        "lanxing",
      );
      expect(isEngineError(bare)).toBe(true);
    });

    it("Story 卡上裸 recurring → validatePackage blocking error", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.1-val-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });
      const cardPath = path.join(
        dataRoot,
        "storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json",
      );
      const cardRaw = JSON.parse(await readFile(cardPath, "utf8")) as {
        exits: Array<{ effects: unknown[] }>;
      };
      cardRaw.exits[0]!.effects.push({
        id: "bare_rec",
        effect: "schedule_recurring_call",
        hour: 9,
        minute: 0,
        scheduleMode: "daily",
        topicHint: "illegal",
      });
      await writeFile(cardPath, JSON.stringify(cardRaw, null, 2) + "\n", "utf8");

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const report = await host.validatePackage("golden_handoff");
      expect(hasBlockingErrors(report)).toBe(true);
    });

    it("ScheduleCard recurring 触发后可 resolve(agent_outbound) 并 beginCall", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.1-out-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const profile = await host.ensureProfile("demo-user");
      profile.schedule = {
        clockMs: 0,
        intents: [
          {
            kind: "recurring",
            intentId: "rec-7.1",
            agentId: "lanxing",
            scheduleCardId: "lanxing_morning_checkin",
            hour: 9,
            minute: 0,
            scheduleMode: "daily",
            status: "active",
            createdAt: "2026-07-14T00:00:00.000Z",
          },
        ],
      };

      if (profile.callCards?.board?.byAgent) {
        profile.callCards.board.byAgent = {};
      }
      // 与 E3 一致：setClockMs 到当日 09:00
      const fireAt = 9 * 3_600_000;
      const fired = host.setClockMs("demo-user", fireAt);
      expect(isEngineError(fired)).toBe(false);
      if (isEngineError(fired)) return;
      expect(fired.some((f) => f.cardId === "lanxing_morning_checkin")).toBe(
        true,
      );

      const outbound = await host.resolveAsync("demo-user", {
        kind: "agent_outbound",
        agentId: "lanxing",
      });
      expect(isEngineError(outbound)).toBe(false);
      if (isEngineError(outbound)) return;
      expect(outbound.cardId).toBe("lanxing_morning_checkin");
      expect(outbound.packageId).toBe(SCHEDULE_PACKAGE_ID);

      const call = await host.beginCall("demo-user", outbound, {
        channel: "manual",
      });
      expect(isEngineError(call)).toBe(false);
      if (isEngineError(call)) return;
      expect(call.frozenCard.cardId).toBe("lanxing_morning_checkin");
      expect(call.frozenCard.cardKind).toBe("schedule");
    });
  });

  describe("§7.2 剧情延迟外呼", () => {
    it("schedule_call_card → advanceClock → resolve outbound → beginCall frozenCard", async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.2-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const profile = await host.ensureProfile("demo-user");
      delete profile.characters.xiaopi;
      profile.callCards.board.byAgent.xiaopi = { pending: [] };
      profile.schedule = { clockMs: 0, intents: [] };

      const resolved = await host.resolveAsync("demo-user", {
        kind: "free_call",
        agentId: "lanxing",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const inv = await host.invokeTool(session.sessionId, "refer_to_expert", {
        target_agent_id: "xiaopi",
        card_id: "xiaopi_waiting_user",
        package_id: "golden_handoff",
        topic_hint: "followup",
        delay_minutes: 5,
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

      const fired = host.advanceClock("demo-user", 5 * 60_000);
      expect(isEngineError(fired)).toBe(false);
      if (isEngineError(fired)) return;
      expect(fired.some((f) => f.cardId === "xiaopi_waiting_user")).toBe(true);

      const outbound = await host.resolveAsync("demo-user", {
        kind: "agent_outbound",
        agentId: "xiaopi",
      });
      expect(isEngineError(outbound)).toBe(false);
      if (isEngineError(outbound)) return;
      expect(outbound.cardId).toBe("xiaopi_waiting_user");

      const call = await host.beginCall("demo-user", outbound, {
        channel: "manual",
      });
      expect(isEngineError(call)).toBe(false);
      if (isEngineError(call)) return;
      expect(call.frozenCard.cardId).toBe("xiaopi_waiting_user");
      expect(call.actualEntry).toBe("outbound_auto");
    });
  });

  describe("§7.3 提前呼入消费延迟外呼", () => {
    async function scheduleXiaoyu() {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-7.3-"));
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });

      const host = createTestHost({ persist: false, dataRoot });
      await host.loadWorkspace(dataRoot);
      const profile = await host.ensureProfile("demo-user");
      delete profile.characters.xiaopi;
      profile.callCards.board.byAgent.xiaopi = { pending: [] };
      profile.schedule = { clockMs: 0, intents: [] };

      const resolved = await host.resolveAsync("demo-user", {
        kind: "free_call",
        agentId: "lanxing",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "manual",
      });
      if (isEngineError(session)) throw session;

      const inv = await host.invokeTool(session.sessionId, "refer_to_expert", {
        target_agent_id: "xiaopi",
        card_id: "xiaopi_waiting_user",
        package_id: "golden_handoff",
        topic_hint: "followup",
        delay_minutes: 5,
      });
      if (isEngineError(inv)) throw inv;

      const end = await host.endCall(session.sessionId, {
        flags: { answered_completed: true },
        completedBeats: [],
        missedRequiredBeats: [],
      });
      if (isEngineError(end)) throw end;
      return host;
    }

    it("挂机后 board 含 either pending；提前 dial 命中故事卡非 Free", async () => {
      const host = await scheduleXiaoyu();
      const mid = await host.ensureProfile("demo-user");
      const pending = mid.callCards.board.byAgent.xiaopi?.pending.find(
        (p) => p.cardId === "xiaopi_waiting_user" && p.status === "pending",
      );
      expect(pending).toBeTruthy();
      expect(pending?.entryMode).toBe("either");
      expect(pending?.activationHint).toBe("outbound_auto");

      const dial = await host.resolveAsync("demo-user", {
        kind: "user_dial",
        agentId: "xiaopi",
      });
      expect(isEngineError(dial)).toBe(false);
      if (isEngineError(dial)) return;
      expect(dial.source).toBe("story_pending");
      expect(dial.cardId).toBe("xiaopi_waiting_user");

      const call = await host.beginCall("demo-user", dial, {
        channel: "manual",
      });
      expect(isEngineError(call)).toBe(false);
      if (isEngineError(call)) return;
      expect(call.actualEntry).toBe("inbound_user_dial");

      const afterBegin = await host.ensureProfile("demo-user");
      const once = afterBegin.schedule?.intents?.find(
        (row) =>
          row !== null &&
          typeof row === "object" &&
          (row as { kind?: string }).kind === "once" &&
          (row as { cardId?: string }).cardId === "xiaopi_waiting_user",
      ) as { status?: string };
      expect(once?.status).toBe("consumed");

      await host.endCall(call.sessionId, {
        flags: { answered_completed: true },
        completedBeats: ["first_hello_done"],
        missedRequiredBeats: [],
      });

      const fired = host.advanceClock("demo-user", 5 * 60_000);
      expect(isEngineError(fired)).toBe(false);
      if (isEngineError(fired)) return;
      expect(
        fired.filter((f) => f.cardId === "xiaopi_waiting_user"),
      ).toHaveLength(0);
    });

    it("正常外呼路径：actualEntry=outbound_auto，命中同一 linked pending", async () => {
      const host = await scheduleXiaoyu();
      const before = await host.ensureProfile("demo-user");
      const linkedId = before.callCards.board.byAgent.xiaopi?.pending.find(
        (p) => p.cardId === "xiaopi_waiting_user",
      )?.instanceId;

      const fired = host.advanceClock("demo-user", 5 * 60_000);
      expect(isEngineError(fired)).toBe(false);
      if (isEngineError(fired)) return;
      expect(fired[0]?.instanceId).toBe(linkedId);

      const outbound = await host.resolveAsync("demo-user", {
        kind: "agent_outbound",
        agentId: "xiaopi",
      });
      expect(isEngineError(outbound)).toBe(false);
      if (isEngineError(outbound)) return;
      expect(outbound.instanceId).toBe(linkedId);

      const call = await host.beginCall("demo-user", outbound, {
        channel: "manual",
      });
      expect(isEngineError(call)).toBe(false);
      if (isEngineError(call)) return;
      expect(call.actualEntry).toBe("outbound_auto");
    });
  });
});
