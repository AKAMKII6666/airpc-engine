/**
 * Prompt Provider Registry 可替换与可扩展契约。
 */
import { describe, expect, it } from "vitest";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildComposeScene,
  composeRenderedPrompt,
  createDefaultPromptProviderRegistry,
  createPromptProviderRegistry,
  isEngineError,
  type CallCardDefinition,
  type PromptProvider,
} from "../../src/index.js";
import { createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");

function cardFixture(): CallCardDefinition {
  return {
    cardId: "card_1",
    cardKind: "free",
    ownerAgentId: "lanxing",
    entryMode: "either",
    context: { objective: "闲聊" },
    exits: [],
  };
}

function sceneFixture() {
  return buildComposeScene({
    chapterId: "__free__",
    entryMode: "either",
    localNowIso: "2026-07-13T20:00:00+08:00",
  });
}

describe("prompt provider registry", () => {
  it("can replace the default provider chain for composeRenderedPrompt", () => {
    const customProvider: PromptProvider = {
      providerId: "custom.only",
      apply(ctx) {
        ctx.systemHard.push("[custom]\nonly custom provider");
      },
    };
    const prompt = composeRenderedPrompt({
      card: cardFixture(),
      scene: sceneFixture(),
      promptProviderRegistry: createPromptProviderRegistry([customProvider]),
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(prompt.systemHard).toEqual(["[custom]\nonly custom provider"]);
    expect(prompt.debug?.providerIds).toEqual(["custom.only"]);
  });

  it("can append external providers after the default chain", () => {
    const extraProvider: PromptProvider = {
      providerId: "custom.extra",
      apply(ctx) {
        ctx.softContext.push("[custom.extra]\nappended");
      },
    };
    const prompt = composeRenderedPrompt({
      card: cardFixture(),
      scene: sceneFixture(),
      promptProviderRegistry: createDefaultPromptProviderRegistry([extraProvider]),
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(prompt.systemHard.join("\n\n")).toContain("[用户本地时间]");
    expect(prompt.softContext).toContain("[custom.extra]\nappended");
    expect(prompt.debug?.providerIds.at(-1)).toBe("custom.extra");
  });

  it("rejects duplicate provider ids at registry creation", () => {
    const provider: PromptProvider = {
      providerId: "custom.duplicate",
      apply() {},
    };
    expect(function () {
      createPromptProviderRegistry([provider, provider]);
    }).toThrow(/duplicate prompt provider id/);
  });

  it("is honored by EngineHost beginCall, not only direct composer calls", async () => {
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-host-provider-"));
    try {
      const dataRoot = path.join(tmpRoot, "data");
      await cp(dataSrc, dataRoot, { recursive: true });
      const hostProvider: PromptProvider = {
        providerId: "custom.host",
        apply(ctx) {
          ctx.systemHard.push("[host-provider]\nfrom host option");
        },
      };
      const host = createTestHost({
        persist: true,
        dataRoot,
        promptProviderRegistry: createPromptProviderRegistry([hostProvider]),
      });
      await host.loadWorkspace(dataRoot);
      await host.ensureProfile("demo-user");
      const resolved = await host.resolveAsync("demo-user", {
        kind: "free_call",
        agentId: "lanxing",
      });
      if (isEngineError(resolved)) throw resolved;
      const session = await host.beginCall("demo-user", resolved, {
        channel: "text_turn",
      });
      if (isEngineError(session)) throw session;

      expect(session.renderedPrompt?.systemHard).toEqual([
        "[host-provider]\nfrom host option",
      ]);
      expect(session.renderedPrompt?.debug?.providerIds).toEqual(["custom.host"]);
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
