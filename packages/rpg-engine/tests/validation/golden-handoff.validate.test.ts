/**
 * 模块名称：golden_handoff validatePackage 回归
 */
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngineHost,
  FREE_PACKAGE_ID,
  hasBlockingErrors,
  validatePackage,
} from "../../src/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

describe("validatePackage", () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = undefined;
    }
  });

  it("golden_handoff has no blocking errors", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(hasBlockingErrors(report)).toBe(false);
    expect(report.errors).toEqual([]);
  });

  it("rejects __free__ sentinel package", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-free-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage(FREE_PACKAGE_ID);
    expect(report.errors.some((e) => e.ruleId === "FREE_PACKAGE_SENTINEL")).toBe(
      true,
    );
  });

  it("CONF_CARD_FILE_MISSING when card file deleted", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-miss-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    await rm(
      path.join(
        dataRoot,
        "storis-packages/golden_handoff/cards/xiaoyu_waiting_user.s-card.json",
      ),
    );
    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(
      report.errors.some((e) => e.ruleId === "CONF_CARD_FILE_MISSING"),
    ).toBe(true);
  });

  it("PROMPT_SCENE_PATCH_HARD on forbidden in patch", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-patch-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const cardPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json",
    );
    const card = JSON.parse(await readFile(cardPath, "utf8")) as Record<
      string,
      unknown
    >;
    const ctx = card.context as Record<string, unknown>;
    ctx.promptScenes = [
      {
        layerId: "bad",
        match: {},
        patch: { forbidden: ["hack"] },
      },
    ];
    await writeFile(cardPath, JSON.stringify(card, null, 2));

    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(
      report.errors.some((e) => e.ruleId === "PROMPT_SCENE_PATCH_HARD"),
    ).toBe(true);
  });

  it("FREE_CARD_MISSING when freeCardId file removed", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-free-miss-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    await rm(
      path.join(dataRoot, "characters/free-cards/xiaoyu_free.s-card.json"),
    );
    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(report.errors.some((e) => e.ruleId === "FREE_CARD_MISSING")).toBe(
      true,
    );
  });

  it("SOCIAL_TARGET_UNKNOWN for bad social edge", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-social-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const charPath = path.join(dataRoot, "characters/doubao-sister.json");
    const char = JSON.parse(await readFile(charPath, "utf8")) as {
      social: Array<{ targetAgentId: string }>;
    };
    char.social.push({ targetAgentId: "no_such_agent" });
    await writeFile(charPath, JSON.stringify(char, null, 2));
    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(
      report.errors.some((e) => e.ruleId === "SOCIAL_TARGET_UNKNOWN"),
    ).toBe(true);
  });

  it("TOOL_DIRECT_EFFECT when toolPolicy.applyEffectsDuringCall", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-direct-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const cardPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json",
    );
    const card = JSON.parse(await readFile(cardPath, "utf8")) as {
      toolPolicy?: Record<string, unknown>;
    };
    card.toolPolicy = {
      ...(card.toolPolicy ?? {}),
      applyEffectsDuringCall: true,
    };
    await writeFile(cardPath, JSON.stringify(card, null, 2));
    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(report.errors.some((e) => e.ruleId === "TOOL_DIRECT_EFFECT")).toBe(
      true,
    );
  });

  it("ASSET_UNKNOWN when playbackClipId has no meta", async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-val-asset-"));
    const dataRoot = path.join(tmpRoot, "data");
    await cp(dataSrc, dataRoot, { recursive: true });
    const cardPath = path.join(
      dataRoot,
      "storis-packages/golden_handoff/cards/doubao_intro_outbound.s-card.json",
    );
    const card = JSON.parse(await readFile(cardPath, "utf8")) as {
      interactionMode?: string;
      context?: Record<string, unknown>;
      toolPolicy?: Record<string, unknown>;
    };
    card.interactionMode = "playback_only";
    card.context = { ...(card.context ?? {}), playbackClipId: "missing_clip" };
    card.toolPolicy = { mode: "deny_all" };
    await writeFile(cardPath, JSON.stringify(card, null, 2));
    const host = createEngineHost({ persist: false, autoMemory: false });
    await host.loadWorkspace(dataRoot);
    const report = await host.validatePackage("golden_handoff");
    expect(report.errors.some((e) => e.ruleId === "ASSET_UNKNOWN")).toBe(true);
  });
});
