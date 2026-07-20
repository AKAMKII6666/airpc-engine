/**
 * E9：Clock／日常 Tick 模拟器
 * once 到期 → pending；recurring → 可观测 once；双 user 隔离；toNextIntent
 */
import { cp, mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  SCHEDULE_DAY_MS,
  createEngineHost,
  isEngineError,
  PlayerProfileSchema,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

async function seedUser(
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
      "doubao-sister": { agentId: "doubao-sister", unlocked: true },
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

function asOnce(row: unknown): {
  kind: "once";
  intentId: string;
  fireAtMs: number;
  status: string;
  sourcedFromRecurringId?: string;
  cardId?: string;
  packageId?: string;
} | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (r.kind !== "once") return null;
  if (typeof r.intentId !== "string" || typeof r.fireAtMs !== "number") {
    return null;
  }
  return {
    kind: "once",
    intentId: r.intentId,
    fireAtMs: r.fireAtMs,
    status: typeof r.status === "string" ? r.status : "pending",
    sourcedFromRecurringId:
      typeof r.sourcedFromRecurringId === "string"
        ? r.sourcedFromRecurringId
        : undefined,
    cardId: typeof r.cardId === "string" ? r.cardId : undefined,
    packageId: typeof r.packageId === "string" ? r.packageId : undefined,
  };
}

describe("E9 clock / daily tick simulator", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("once：快进到期 → outbound pending；toNextIntent 推到 fireAt", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e9-once-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.schedule = { clockMs: 0, intents: [] };
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent = {};
    }

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
      delay_minutes: 30,
      topic_hint: "e9-once",
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

    const early = host.advanceClock("demo-user", 10 * 60_000);
    expect(isEngineError(early)).toBe(false);
    if (isEngineError(early)) return;
    expect(early).toEqual([]);

    const next = host.advanceClockToNextIntent("demo-user");
    expect(isEngineError(next)).toBe(false);
    if (isEngineError(next)) return;
    expect(next.reason).toBe("once");
    expect(next.toClockMs).toBe(30 * 60_000);
    expect(next.fired.some((f) => f.cardId === "doubao_intro_outbound")).toBe(
      true,
    );

    const after = await host.ensureProfile("demo-user");
    expect(after.schedule?.clockMs).toBe(30 * 60_000);
    expect(
      after.callCards.board.byAgent["doubao-sister"]?.pending?.some(
        (p) => p.cardId === "doubao_intro_outbound",
      ),
    ).toBe(true);
  });

  it("recurring：跨过逻辑日时刻 → ScheduleCard once 可点火", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e9-rec-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.schedule = {
      clockMs: 0,
      intents: [
        {
          kind: "recurring",
          intentId: "rec-morning",
          agentId: "doubao-sister",
          hour: 9,
          minute: 30,
          scheduleMode: "daily",
          status: "active",
          topicHint: "morning",
          scheduleCardId: "doubao_morning_checkin",
        },
      ],
    };
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent = {};
    }

    const fireAt = 9 * 3_600_000 + 30 * 60_000;
    const jumped = host.setClockMs("demo-user", fireAt);
    expect(isEngineError(jumped)).toBe(false);
    if (isEngineError(jumped)) return;
    expect(jumped.some((f) => f.cardId === "doubao_morning_checkin")).toBe(true);
    expect(jumped.some((f) => f.packageId === "__schedule__")).toBe(true);

    const after = await host.ensureProfile("demo-user");
    expect(after.schedule?.clockMs).toBe(fireAt);
    const onceRow = (after.schedule?.intents ?? []).map(asOnce).find(function (r) {
      return r?.sourcedFromRecurringId === "rec-morning";
    });
    expect(onceRow).toBeTruthy();
    expect(onceRow?.status).toBe("fired");
    expect(onceRow?.fireAtMs).toBe(fireAt);
    expect(onceRow?.cardId).toBe("doubao_morning_checkin");
    expect(onceRow?.packageId).toBe("__schedule__");

    const recurring = (after.schedule?.intents ?? []).find(function (row) {
      return (
        row !== null &&
        typeof row === "object" &&
        (row as { kind?: string }).kind === "recurring"
      );
    }) as { status?: string; lastMaterializedAtMs?: number } | undefined;
    expect(recurring?.status).toBe("active");
    expect(recurring?.lastMaterializedAtMs).toBe(fireAt);

    // 同日不再重复物化
    const again = host.advanceClock("demo-user", 1);
    expect(isEngineError(again)).toBe(false);
    if (isEngineError(again)) return;
    expect(again).toEqual([]);
    const still = await host.ensureProfile("demo-user");
    const occCount = (still.schedule?.intents ?? [])
      .map(asOnce)
      .filter(function (r) {
        return r?.sourcedFromRecurringId === "rec-morning";
      }).length;
    expect(occCount).toBe(1);

    // 下一日再次出现
    const nextDay = host.setClockMs("demo-user", fireAt + SCHEDULE_DAY_MS);
    expect(isEngineError(nextDay)).toBe(false);
    if (isEngineError(nextDay)) return;
    expect(nextDay.some((f) => f.cardId === "doubao_morning_checkin")).toBe(true);
    const day2 = await host.ensureProfile("demo-user");
    const occ2 = (day2.schedule?.intents ?? [])
      .map(asOnce)
      .filter(function (r) {
        return r?.sourcedFromRecurringId === "rec-morning";
      });
    expect(occ2.length).toBe(2);
  });

  it("recurring 无卡引用：disabled，不物化 once，不挂 pending", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e9-obs-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: true, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const profile = await host.ensureProfile("demo-user");
    profile.schedule = {
      clockMs: 0,
      intents: [
        {
          kind: "recurring",
          intentId: "rec-obs",
          agentId: "doubao-sister",
          hour: 9,
          minute: 0,
          scheduleMode: "daily",
          status: "active",
          topicHint: "obs-only",
        },
      ],
    };
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent = {};
    }

    const fired = host.advanceClock("demo-user", 10 * 3_600_000);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(fired).toEqual([]);

    const after = await host.ensureProfile("demo-user");
    const onceRow = (after.schedule?.intents ?? []).map(asOnce).find(function (r) {
      return r?.sourcedFromRecurringId === "rec-obs";
    });
    expect(onceRow).toBeUndefined();
    const rec = (after.schedule?.intents ?? []).find(function (row) {
      return (
        row !== null &&
        typeof row === "object" &&
        (row as { intentId?: string }).intentId === "rec-obs"
      );
    }) as { status?: string } | undefined;
    expect(rec?.status).toBe("disabled");
    expect(
      after.callCards.board.byAgent["doubao-sister"]?.pending ?? [],
    ).toEqual([]);
  });

  it("隔离：A 的 Tick 不改 B 的 clock／pending", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e9-iso-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    await seedUser(dataRoot, "user-b", "小乙");

    const host = createEngineHost({ persist: true, autoMemory: false });
    await host.loadWorkspace(dataRoot);

    const profileA = await host.ensureProfile("demo-user");
    profileA.schedule = {
      clockMs: 0,
      intents: [
        {
          kind: "once",
          intentId: "a-once",
          agentId: "doubao-sister",
          cardId: "doubao_intro_outbound",
          packageId: "golden_handoff",
          fireAtMs: 5_000,
          status: "pending",
        },
      ],
    };
    if (profileA.callCards?.board?.byAgent) {
      profileA.callCards.board.byAgent = {};
    }

    await host.ensureProfile("user-b");

    const firedA = host.setClockMs("demo-user", 5_000);
    expect(isEngineError(firedA)).toBe(false);
    if (isEngineError(firedA)) return;
    expect(firedA).toHaveLength(1);

    const b = await host.ensureProfile("user-b");
    expect(b.schedule?.clockMs).toBe(0);
    expect(b.schedule?.intents ?? []).toEqual([]);
    expect(b.callCards.board.byAgent["doubao-sister"]?.pending ?? []).toEqual(
      [],
    );
  });
});
