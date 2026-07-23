/**
 * REST-E7：ScheduleCard begin 不写 stories.__schedule__。
 */
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  isEngineError,
  SCHEDULE_PACKAGE_ID,
} from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const dataSrc = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../data",
);

describe("ScheduleCard StorySave gate (REST-E6/E7)", () => {
  let tmpRoot = "";
  afterEach(async () => {
    if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true });
  });

  it("beginCall 后不存在 profile.stories.__schedule__", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-sched-nosave-"));
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
          intentId: "rec-nosave",
          agentId: "lanxing",
          hour: 9,
          minute: 0,
          scheduleMode: "daily",
          status: "active",
          scheduleCardId: "lanxing_morning_checkin",
        },
      ],
    };
    profile.callCards.board.byAgent = {};
    profile.stories = {};

    const fireAt = 9 * 3_600_000;
    const fired = host.setClockMs("demo-user", fireAt);
    expect(isEngineError(fired)).toBe(false);
    if (isEngineError(fired)) return;

    const resolved = await host.resolveAsync("demo-user", {
      kind: "agent_outbound",
      agentId: "lanxing",
    });
    expect(isEngineError(resolved)).toBe(false);
    if (isEngineError(resolved)) return;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;
    expect(session.packageId).toBe(SCHEDULE_PACKAGE_ID);

    const after = await host.ensureProfile("demo-user");
    expect(after.stories?.["__schedule__"]).toBeUndefined();
  });
});
