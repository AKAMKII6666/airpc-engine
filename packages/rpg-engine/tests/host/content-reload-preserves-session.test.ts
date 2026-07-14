/**
 * S1：Content 热重载默认保留 Session / Profile
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

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("content reload preserves runtime", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("loadWorkspace 默认不清 sessions / profiles；resetRuntime 才踢", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s1-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    expect(isEngineError(resolved)).toBe(false);
    if (isEngineError(resolved)) return;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
      localNowIso: "2026-07-13T16:00:00+08:00",
      timeZone: "Asia/Shanghai",
    });
    expect(isEngineError(session)).toBe(false);
    if (isEngineError(session)) return;

    const sessionId = session.sessionId;
    await host.loadWorkspace(dataRoot, { resetRuntime: false });

    expect(host.getActiveSession("demo-user")?.sessionId).toBe(sessionId);
    expect(host.getSession(sessionId)?.status).toBe("in_call");

    host.resetRuntime();
    expect(host.getActiveSession("demo-user")).toBeNull();
    expect(host.getSession(sessionId)).toBeNull();
  });

  it("loadWorkspace({ resetRuntime: true }) 清空活跃 Session", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-s1-reset-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    await host.ensureProfile("demo-user");

    const resolved = await host.resolveAsync("demo-user", {
      kind: "simulate_start",
      packageId: "golden_handoff",
      cardId: "doubao_intro_outbound",
    });
    if (isEngineError(resolved)) throw resolved;

    const session = await host.beginCall("demo-user", resolved, {
      channel: "manual",
    });
    if (isEngineError(session)) throw session;

    await host.loadWorkspace(dataRoot, { resetRuntime: true });
    expect(host.getActiveSession("demo-user")).toBeNull();
    expect(host.getSession(session.sessionId)).toBeNull();
  });
});
