/**
 * V1-E1–E3：ScheduleCard schema／recurring 禁裸／物化可 resolve outbound
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  CallCardDefinitionSchema,
  hasBlockingErrors,
  hasRecurringCardRef,
  isEngineError,
  isScheduleCard,
  SCHEDULE_PACKAGE_ID,
  resolveRecurringCardTarget,
} from "../../src/index.js";
import { expandRegisterExitEffects } from "../../src/tools/expandExitEffects.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("ScheduleCard + recurring (V1-E1–E3)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("V1-E1：cardKind=schedule 可解析；仓库 schedule-cards 可加载", async () => {
    const disk = JSON.parse(
      await readFile(
        path.join(
          dataSrc,
          "characters/schedule-cards/lanxing_morning_checkin.s-card.json",
        ),
        "utf8",
      ),
    );
    const card = CallCardDefinitionSchema.parse(disk);
    expect(isScheduleCard(card)).toBe(true);
    expect(card.schedule?.mode).toBe("daily");
    expect(card.entryMode).toBe("outbound_auto");

    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-load-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const pre = await host.preloadCard(
      SCHEDULE_PACKAGE_ID,
      "lanxing_morning_checkin",
    );
    expect(isEngineError(pre)).toBe(false);
  });

  it("V1-E2：expand／validate 拒绝裸 recurring；Story 上 recurring 为 error", async () => {
    const bare = expandRegisterExitEffects(
      "schedule_recurring_call",
      { topic_hint: "only hint", hour: 8, minute: 0 },
      "lanxing",
    );
    expect(isEngineError(bare)).toBe(true);

    const ok = expandRegisterExitEffects(
      "schedule_recurring_call",
      {
        schedule_card_id: "lanxing_morning_checkin",
        hour: 8,
        minute: 0,
      },
      "lanxing",
    );
    expect(isEngineError(ok)).toBe(false);
    if (isEngineError(ok)) return;
    expect(ok[0]?.scheduleCardId).toBe("lanxing_morning_checkin");

    expect(hasRecurringCardRef({ topicHint: "x" } as never)).toBe(false);
    expect(
      resolveRecurringCardTarget({
        scheduleCardId: "lanxing_morning_checkin",
      }),
    ).toEqual({
      cardId: "lanxing_morning_checkin",
      packageId: SCHEDULE_PACKAGE_ID,
    });

    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-val-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const cardPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json",
    );
    const cardRaw = JSON.parse(await readFile(cardPath, "utf8")) as {
      exits: Array<{ exitId: string; effects: unknown[] }>;
    };
    cardRaw.exits[0]!.effects.push({
      id: "bad_recurring",
      effect: "schedule_recurring_call",
      hour: 9,
      minute: 0,
      scheduleMode: "daily",
      topicHint: "illegal on story",
    });
    await writeFile(cardPath, JSON.stringify(cardRaw, null, 2) + "\n", "utf8");

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(hasBlockingErrors(report)).toBe(true);
    expect(
      report.errors.some((e) => e.ruleId === "SCHEDULE_RECURRING_CARD_REQUIRED"),
    ).toBe(true);
    expect(
      report.errors.some((e) => e.ruleId === "SCHEDULE_RECURRING_IN_STORY"),
    ).toBe(true);
  });

  it("V1-E2b：Free/Schedule 宿主 recurring 指向 StoryCard → SCHEDULE_CARD_KIND；合法目标通过", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-kind-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const confPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/story.conf.json",
    );
    const conf = JSON.parse(await readFile(confPath, "utf8")) as {
      cards: Array<{ cardId: string }>;
    };
    conf.cards.push({ cardId: "host_free_recurring" });
    await writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");

    const freeHostStoryTarget = {
      cardId: "host_free_recurring",
      cardKind: "free",
      title: "test free host",
      ownerAgentId: "lanxing",
      entryMode: "either",
      interactionMode: "realtime_dialogue",
      context: {
        privateBrief: "t",
        speakableBrief: "t",
        background: "",
        premise: "",
        emotion: "",
        objective: "",
        forbidden: [],
      },
      objectives: { requiredBeats: [] },
      toolPolicy: { mode: "inherit_free" },
      exits: [
        {
          exitId: "ok",
          priority: 1,
          condition: { op: "always" },
          effects: [
            {
              id: "bad_story_target",
              effect: "schedule_recurring_call",
              hour: 8,
              minute: 0,
              scheduleMode: "daily",
              cardId: "doubao_intro_outbound",
              packageId: "golden_handoff",
            },
            {
              id: "ok_schedule_ref",
              effect: "schedule_recurring_call",
              hour: 9,
              minute: 0,
              scheduleMode: "daily",
              scheduleCardId: "lanxing_morning_checkin",
            },
            {
              id: "ok_free_ref",
              effect: "schedule_recurring_call",
              hour: 10,
              minute: 0,
              scheduleMode: "daily",
              cardId: "lanxing_free",
              packageId: "__free__",
            },
            {
              id: "ok_schedule_pkg",
              effect: "schedule_recurring_call",
              hour: 11,
              minute: 0,
              scheduleMode: "daily",
              cardId: "lanxing_morning_checkin",
              packageId: SCHEDULE_PACKAGE_ID,
            },
          ],
        },
      ],
    };
    await writeFile(
      path.join(
        dataRoot,
        "storis-packages/golden_handoff/cards/host_free_recurring.s-card.json",
      ),
      JSON.stringify(freeHostStoryTarget, null, 2) + "\n",
      "utf8",
    );

    const host = createTestHost({ persist: false, dataRoot });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    const kindErrors = report.errors.filter(
      (e) => e.ruleId === "SCHEDULE_CARD_KIND",
    );
    expect(kindErrors.length).toBeGreaterThanOrEqual(1);
    expect(
      kindErrors.some((e) => e.message.includes("StoryCard")),
    ).toBe(true);
    expect(
      kindErrors.some((e) => e.path.includes("ok_schedule_ref")),
    ).toBe(false);
    expect(kindErrors.some((e) => e.path.includes("ok_free_ref"))).toBe(
      false,
    );
    expect(
      kindErrors.some((e) => e.path.includes("ok_schedule_pkg")),
    ).toBe(false);
    expect(
      report.errors.some((e) => e.ruleId === "SCHEDULE_RECURRING_IN_STORY"),
    ).toBe(false);
  });

  it("V1-E3：物化 → agent_outbound → beginCall frozenCard 为 ScheduleCard", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-e3-"));
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
          intentId: "rec-e3",
          agentId: "lanxing",
          hour: 9,
          minute: 0,
          scheduleMode: "daily",
          status: "active",
          scheduleCardId: "lanxing_morning_checkin",
        },
      ],
    };
    if (profile.callCards?.board?.byAgent) {
      profile.callCards.board.byAgent = {};
    }

    const fireAt = 9 * 3_600_000;
    const fired = host.setClockMs("demo-user", fireAt);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;
    expect(fired[0]?.cardId).toBe("lanxing_morning_checkin");
    expect(fired[0]?.packageId).toBe(SCHEDULE_PACKAGE_ID);

    const resolved = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "lanxing",
    });
    expect(isEngineError(resolved)).toBe(false);
    if (isEngineError(resolved)) return;
    expect(resolved.cardId).toBe("lanxing_morning_checkin");
    expect(resolved.packageId).toBe(SCHEDULE_PACKAGE_ID);
    expect(resolved.card.cardKind).toBe("schedule");

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;
    expect(session.frozenCard.cardKind).toBe("schedule");
    expect(session.frozenCard.cardId).toBe("lanxing_morning_checkin");
    expect(session.packageId).toBe(SCHEDULE_PACKAGE_ID);
  });
});
