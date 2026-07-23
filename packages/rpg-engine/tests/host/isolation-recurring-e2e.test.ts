/**
 * E4c：双 userId 隔离 + recurring 意图写入／本仓调试语义
 * 调试语义（E9）：advanceClock 跨过逻辑日时刻 → 生成可观测 once；无 card 不点火
 */
import { cp, mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  isEngineError,
  PlayerProfileSchema,
} from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function seedSecondUser(
  dataRoot: string,
  userId: string,
  nickname: string,
): Promise<void> {
  const now = "2026-07-15T00:00:00.000Z";
  const profile = PlayerProfileSchema.parse({
    schemaVersion: 1,
    userId,
    user: {
      userId,
      nickname,
      createdAt: now,
      updatedAt: now,
    },
    characters: {
      "lanxing": { agentId: "lanxing", unlocked: true },
    },
    schedule: { clockMs: 0, intents: [] },
  });
  const dir = path.join(dataRoot, "users", userId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "profile.save.json"),
    JSON.stringify(profile, null, 2) + "\n",
    "utf8",
  );
}

type RecurringRow = {
  kind: "recurring";
  intentId: string;
  agentId: string;
  hour: number;
  minute: number;
  scheduleMode: string;
  status: string;
  topicHint?: string;
};

function asRecurring(row: unknown): RecurringRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (r.kind !== "recurring") return null;
  if (typeof r.intentId !== "string" || typeof r.agentId !== "string") {
    return null;
  }
  if (typeof r.hour !== "number" || typeof r.minute !== "number") {
    return null;
  }
  if (typeof r.scheduleMode !== "string" || typeof r.status !== "string") {
    return null;
  }
  return {
    kind: "recurring",
    intentId: r.intentId,
    agentId: r.agentId,
    hour: r.hour,
    minute: r.minute,
    scheduleMode: r.scheduleMode,
    status: r.status,
    topicHint: typeof r.topicHint === "string" ? r.topicHint : undefined,
  };
}

describe("E4c isolation + recurring", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("双 userId：A 的 schedule once 点火不影响 B", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4c-iso-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    await seedSecondUser(dataRoot, "user-b", "小乙");

    const host = createTestHost({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);

    const profileA = await host.ensureProfile("demo-user");
    profileA.schedule = { clockMs: 0, intents: [] };
    if (profileA.callCards?.board?.byAgent) {
      profileA.callCards.board.byAgent = {};
    }
    const profileB = await host.ensureProfile("user-b");
    expect(profileB.schedule?.clockMs).toBe(0);
    expect(profileB.schedule?.intents ?? []).toEqual([]);

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "schedule_reminder_call", {
      card_id: "doubao_intro_outbound",
      package_id: "golden_handoff",
      delay_minutes: 5,
      topic_hint: "iso-a",
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

    const firedA = host.advanceClock("demo-user", 5 * 60_000);
    expect(isEngineError(firedA)).toBe(false);
    if (isEngineError(firedA)) return;
    expect(firedA.some((f) => f.cardId === "doubao_intro_outbound")).toBe(true);

    const afterA = await host.ensureProfile("demo-user");
    expect(afterA.schedule?.clockMs).toBe(5 * 60_000);
    expect(
      afterA.callCards.board.byAgent["lanxing"]?.pending?.some(
        (p) => p.cardId === "doubao_intro_outbound",
      ),
    ).toBe(true);

    const afterB = await host.ensureProfile("user-b");
    expect(afterB.schedule?.clockMs).toBe(0);
    expect(afterB.schedule?.intents ?? []).toEqual([]);
    expect(afterB.callCards.board.byAgent["lanxing"]?.pending ?? []).toEqual(
      [],
    );

    const firedB = host.advanceClock("user-b", 5 * 60_000);
    expect(isEngineError(firedB)).toBe(false);
    if (isEngineError(firedB)) return;
    expect(firedB).toEqual([]);
    expect((await host.ensureProfile("user-b")).schedule?.clockMs).toBe(
      5 * 60_000,
    );
    expect(
      (await host.ensureProfile("user-b")).callCards.board.byAgent[
        "lanxing"
      ]?.pending ?? [],
    ).toEqual([]);
  });

  it("recurring：拒绝裸 topicHint；须 schedule_card_id", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4c-rec-bare-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const bare = await host.invokeTool(
      session.sessionId,
      "schedule_recurring_call",
      {
        topic_hint: "morning checkin",
        hour: 9,
        minute: 30,
        schedule_mode: "daily",
      },
    );
    expect(isEngineError(bare)).toBe(true);
  });

  it("recurring：写入 scheduleCardId；Tick 点火 ScheduleCard pending", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4c-rec-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHost({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.schedule = { clockMs: 0, intents: [] };
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent = {};
    }

    const resolved = await host.resolveAsync("demo-user", {
      kind: "free_call",
      agentId: "lanxing",
    });
    if (isEngineError(resolved)) throw resolved;
    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    const inv = await host.invokeTool(session.sessionId, "schedule_recurring_call", {
      schedule_card_id: "lanxing_morning_checkin",
      topic_hint: "morning checkin",
      hour: 9,
      minute: 30,
      schedule_mode: "daily",
    });
    expect(isEngineError(inv)).toBe(false);
    if (isEngineError(inv)) return;
    expect(inv.behavior).toBe("register_exit");
    expect(session.exitCandidates[0]?.effects.map((e) => e.effect)).toEqual([
      "schedule_recurring_call",
    ]);

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: [],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(
      end.effectPlanResult.results.some((r) => r.status === "executed"),
    ).toBe(true);

    const afterWrite = await host.ensureProfile("demo-user");
    const recurring = (afterWrite.schedule?.intents ?? [])
      .map(asRecurring)
      .find(Boolean);
    expect(recurring).toBeTruthy();
    expect(recurring?.kind).toBe("recurring");
    expect(recurring?.agentId).toBe("lanxing");
    expect(recurring?.hour).toBe(9);
    expect(recurring?.minute).toBe(30);
    expect(recurring?.scheduleMode).toBe("daily");
    expect(recurring?.status).toBe("active");
    expect(recurring?.topicHint).toBe("morning checkin");
    expect(typeof recurring?.intentId).toBe("string");
    expect(recurring?.intentId?.length).toBeGreaterThan(0);

    const fireAt = 9 * 3_600_000 + 30 * 60_000;
    const fired = host.setClockMs("demo-user", fireAt);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(fired.some((f) => f.cardId === "lanxing_morning_checkin")).toBe(true);

    const afterTick = await host.ensureProfile("demo-user");
    expect(afterTick.schedule?.clockMs).toBe(fireAt);
    const still = (afterTick.schedule?.intents ?? [])
      .map(asRecurring)
      .find(Boolean);
    expect(still?.status).toBe("active");
    expect(still?.intentId).toBe(recurring?.intentId);
    expect(
      afterTick.callCards.board.byAgent["lanxing"]?.pending?.some(
        (p) =>
          p.cardId === "lanxing_morning_checkin" &&
          p.packageId === "__schedule__",
      ),
    ).toBe(true);
  });
});
