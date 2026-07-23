/**
 * S8-16：故事包内 cardKind=schedule 剧情节点 ≠ characters/schedule-cards 日常卡。
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEngineHost } from "../../src/index.js";
import { createFsContentPort } from "../helpers/fsContentPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

const MIN_CTX = {
  privateBrief: "t",
  speakableBrief: "t",
  background: "",
  premise: "",
  emotion: "",
  objective: "",
  forbidden: [] as string[],
};

/** 包内剧情调度节点夹具（非 schedule-cards） */
function plotScheduleNodeCard() {
  return {
    cardId: "plot_schedule_node",
    cardKind: "schedule" as const,
    title: "包内剧情调度节点",
    ownerAgentId: "lanxing",
    entryMode: "outbound_auto" as const,
    interactionMode: "realtime_dialogue" as const,
    context: MIN_CTX,
    objectives: { requiredBeats: [] as string[] },
    toolPolicy: { mode: "inherit_free" as const },
    schedule: { mode: "daily" as const, hour: 10 },
    exits: [] as unknown[],
  };
}

/** Free 宿主：一条非法包内 schedule 目标 + 一条合法 scheduleCardId */
function freeHostWithRecurringEffects() {
  return {
    cardId: "free_host_for_recurring",
    cardKind: "free" as const,
    title: "host",
    ownerAgentId: "lanxing",
    entryMode: "either" as const,
    interactionMode: "realtime_dialogue" as const,
    context: MIN_CTX,
    objectives: { requiredBeats: [] as string[] },
    toolPolicy: { mode: "inherit_free" as const },
    exits: [
      {
        exitId: "ok",
        priority: 1,
        condition: { op: "always" as const },
        effects: [
          {
            id: "bad_pkg_schedule_target",
            effect: "schedule_recurring_call",
            hour: 8,
            minute: 0,
            scheduleMode: "daily",
            cardId: "plot_schedule_node",
            packageId: "golden_handoff",
          },
          {
            id: "ok_schedule_cards_ref",
            effect: "schedule_recurring_call",
            hour: 9,
            minute: 0,
            scheduleMode: "daily",
            scheduleCardId: "lanxing_morning_checkin",
          },
        ],
      },
    ],
  };
}

describe("schedule package division (S8-16)", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("package-local schedule node cannot be recurring target", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-pkg-node-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const confPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/story.conf.json",
    );
    const conf = JSON.parse(await readFile(confPath, "utf8")) as {
      cards: Array<{ cardId: string }>;
    };
    conf.cards.push(
      { cardId: "plot_schedule_node" },
      { cardId: "free_host_for_recurring" },
    );
    await writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");

    const cardsDir = path.join(
      dataRoot,
      "storis-packages/golden_handoff/cards",
    );
    await writeFile(
      path.join(cardsDir, "plot_schedule_node.s-card.json"),
      JSON.stringify(plotScheduleNodeCard(), null, 2) + "\n",
      "utf8",
    );
    await writeFile(
      path.join(cardsDir, "free_host_for_recurring.s-card.json"),
      JSON.stringify(freeHostWithRecurringEffects(), null, 2) + "\n",
      "utf8",
    );

    const host = createEngineHost({ persist: false, content: createFsContentPort() });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    const kindErrors = report.errors.filter(
      (e) => e.ruleId === "SCHEDULE_CARD_KIND",
    );
    expect(
      kindErrors.some(
        (e) =>
          e.path.includes("bad_pkg_schedule_target") &&
          e.message.includes("package-local schedule node"),
      ),
    ).toBe(true);
    expect(
      kindErrors.some((e) => e.path.includes("ok_schedule_cards_ref")),
    ).toBe(false);
  });
});
