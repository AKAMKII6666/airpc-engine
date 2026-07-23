/**
 * E4b：角色 A（澜星）出口写 B（小雨）的 knowledge 与 memory
 */
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import { createTestHostWithMemory } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("E4b A→B knowledge／memory", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("lanxing exit writes xiaopi knowledge + semantic memory", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-e4b-ab-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createTestHostWithMemory({ persist: true, dataRoot });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_a_writes_b",
    });
    if (isEngineError(resolved)) throw resolved;
    expect(resolved.agentId).toBe("lanxing");
    expect(resolved.cardId).toBe("doubao_a_writes_b");

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;
    expect(session.resolve.agentId).toBe("lanxing");

    const end = await host.endCall(session.sessionId, {
      flags: { answered_completed: true },
      completedBeats: ["told_cross_agent"],
      missedRequiredBeats: [],
    });
    expect(isEngineError(end)).toBe(false);
    if (isEngineError(end)) return;
    expect(end.selectedExitId).toBe("a_writes_b_ok");
    expect(
      end.effectPlanResult.results.every((r) => r.status === "executed"),
    ).toBe(true);

    const saved = JSON.parse(
      await readFile(
        path.join(dataRoot, "users/demo-user/profile.save.json"),
        "utf8",
      ),
    ) as {
      world?: {
        facts?: Array<{ factId?: string }>;
        knowledge?: Record<string, string[]>;
      };
    };

    expect(
      saved.world?.facts?.some((f) => f.factId === "doubao_shared_xiaopi_topic"),
    ).toBe(true);
    expect(saved.world?.knowledge?.xiaopi).toContain(
      "doubao_shared_xiaopi_topic",
    );
    // 通话方是澜星，不应把 knowledge 误写到澜星键下
    expect(saved.world?.knowledge?.["lanxing"] ?? []).not.toContain(
      "doubao_shared_xiaopi_topic",
    );

    const mem = host.getMemoryPort();
    expect(mem).toBeTruthy();
    const hits = await mem!.search({
      userId: "demo-user",
      agentId: "xiaopi",
      textQuery: "doubao_shared_xiaopi_topic",
      maxResults: 5,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.layer === "semantic")).toBe(true);
    expect(hits.some((h) => h.text.includes("澜星转告"))).toBe(true);

    const aHits = await mem!.search({
      userId: "demo-user",
      agentId: "lanxing",
      textQuery: "doubao_shared_xiaopi_topic",
      maxResults: 5,
    });
    expect(aHits.some((h) => h.text.includes("澜星转告"))).toBe(false);
  });
});
