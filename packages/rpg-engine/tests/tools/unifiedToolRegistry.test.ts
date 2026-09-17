/** 统一 ToolRegistry / ToolPolicy v2 / external 调用闭环。 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createToolRegistry,
  isEngineError,
  listToolsForCard,
  type CallCardDefinition,
  type RegisteredTool,
} from "../../src/index.js";
import { copyDataTree, createTestHost } from "../helpers/inMemoryMemoryPort.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataSrc = path.join(repoRoot, "data");
const pluginToolId = "plugin:test-tools:echo";

function pluginRegistration(): RegisteredTool {
  return {
    definition: {
      toolId: pluginToolId,
      displayName: "测试回声",
      description: "回显已校验参数，供统一插件 FC 测试。",
      inputSchema: {
        type: "object",
        properties: {
          action: { enum: ["echo", "fail", "timeout", "large"] },
          value: { type: "string" },
        },
        required: ["action"],
        additionalProperties: false,
      },
      allowedCardKinds: ["free", "story"],
      allowedInPlayback: false,
      behavior: "external",
    },
    source: {
      kind: "plugin",
      providerId: "test-tools",
      displayName: "测试工具插件",
    },
    inheritByDefault: false,
    async invoke(input) {
      if (input.args.action === "fail") throw new Error("plugin_failed");
      if (input.args.action === "timeout") {
        return new Promise(function () {});
      }
      if (input.args.action === "large") return "x".repeat(33 * 1024);
      return {
        value: input.args.value,
        sessionId: input.sessionId,
      };
    },
  };
}

const registry = createToolRegistry([pluginRegistration()]);

describe("unified ToolRegistry catalog", function () {
  it("merges sources, rejects collisions, and does not inherit plugin tools", function () {
    expect(registry.byId.get("request_hangup")?.source.kind).toBe("shell");
    expect(registry.byId.get(pluginToolId)?.source.kind).toBe("plugin");
    expect(function () {
      createToolRegistry([pluginRegistration(), pluginRegistration()]);
    }).toThrow(/toolId_conflict/);
    expect(function () {
      createToolRegistry([{
        ...pluginRegistration(),
        inheritByDefault: true,
      }]);
    }).toThrow(/plugin_tool_cannot_inherit/);
    expect(function () {
      const invalid = pluginRegistration();
      invalid.definition = { ...invalid.definition, toolId: "echo" };
      createToolRegistry([invalid]);
    }).toThrow(/plugin_tool_id_invalid/);
    const inheritedCard: CallCardDefinition = {
      cardId: "free",
      cardKind: "free",
      ownerAgentId: "lanxing",
      interactionMode: "realtime_dialogue",
      toolPolicy: { schemaVersion: 2, mode: "inherit_free" },
      exits: [],
    };
    expect(
      listToolsForCard(inheritedCard, { registry }).map(function (tool) {
        return tool.toolId;
      }),
    ).not.toContain(pluginToolId);

    const playbackCard: CallCardDefinition = {
      ...inheritedCard,
      interactionMode: "playback_only",
      toolPolicy: {
        schemaVersion: 2,
        mode: "allowlist",
        allowedToolIds: ["request_hangup", pluginToolId],
      },
    };
    expect(listToolsForCard(playbackCard, { registry })).toEqual([]);
  });
});

type RuntimeFixture = {
  tmpRoot: string;
  host: ReturnType<typeof createTestHost>;
  sessionId: string;
};

async function createRuntimeFixture(): Promise<RuntimeFixture> {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "airpc-tool-registry-"));
  const dataRoot = path.join(tmpRoot, "data");
  await copyDataTree(dataSrc, dataRoot);
  const cardPath = path.join(
    dataRoot,
    "characters/free-cards/lanxing_free.s-card.json",
  );
  const card = JSON.parse(await readFile(cardPath, "utf8")) as CallCardDefinition;
  card.toolPolicy = {
    schemaVersion: 2,
    mode: "allowlist",
    allowedToolIds: [pluginToolId, "request_hangup"],
    options: {
      request_hangup: {
        allowedReasonKinds: ["natural", "policy", "handoff"],
      },
    },
  };
  await writeFile(cardPath, `${JSON.stringify(card, null, 2)}\n`, "utf8");
  const host = createTestHost({ persist: false, dataRoot, toolRegistry: registry });
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
  return { tmpRoot, host, sessionId: session.sessionId };
}

function runtimeSuite(title: string, registerTests: (getFixture: () => RuntimeFixture) => void) {
  describe(title, function () {
    let fixture: RuntimeFixture;
    beforeEach(async function () {
      fixture = await createRuntimeFixture();
    });
    afterEach(async function () {
      vi.useRealTimers();
      await rm(fixture.tmpRoot, { recursive: true, force: true });
    });
    registerTests(function () { return fixture; });
  });
}

runtimeSuite("unified ToolRegistry external runtime", function (getFixture) {
  it("invokes an explicitly authorized plugin tool through Host.invokeTool", async function () {
    const { host, sessionId } = getFixture();
    const result = await host.invokeTool(sessionId, pluginToolId, {
      action: "echo",
      value: "ok",
    });
    expect(result).toMatchObject({
      ok: true,
      behavior: "external",
      localResult: { value: "ok", sessionId },
    });
  });

  it("returns standard errors for invalid args, exceptions and oversized results", async function () {
    const { host, sessionId } = getFixture();
    const invalid = await host.invokeTool(sessionId, pluginToolId, {});
    expect(isEngineError(invalid) && invalid.details).toMatchObject({
      rule: "TOOL_ARGS_INVALID",
    });
    const failed = await host.invokeTool(sessionId, pluginToolId, {
      action: "fail",
    });
    expect(isEngineError(failed) && failed.details).toMatchObject({
      rule: "TOOL_INVOKE_FAILED",
    });
    const large = await host.invokeTool(sessionId, pluginToolId, {
      action: "large",
    });
    expect(isEngineError(large) && large.details).toMatchObject({
      rule: "TOOL_RESULT_TOO_LARGE",
    });
  });

  it("times out an external tool without ending the session", async function () {
    const { host, sessionId } = getFixture();
    vi.useFakeTimers();
    const pending = host.invokeTool(sessionId, pluginToolId, {
      action: "timeout",
    });
    await vi.advanceTimersByTimeAsync(10_001);
    const result = await pending;
    expect(isEngineError(result) && result.details).toMatchObject({
      rule: "TOOL_TIMEOUT",
    });
    expect(host.getSession(sessionId)?.status).toBe("in_call");
  });
});

runtimeSuite("unified ToolRegistry shell runtime", function (getFixture) {
  it("enforces hangup user and handoff guards through the same Host entry", async function () {
    const { host, sessionId } = getFixture();
    const beforeUser = await host.invokeTool(sessionId, "request_hangup", {
      reasonKind: "natural",
    });
    expect(isEngineError(beforeUser) && beforeUser.details).toMatchObject({
      rule: "TOOL_HANGUP_BEFORE_USER",
    });
    host.recordChatTurn(sessionId, { role: "user", text: "再见" });
    const handoff = await host.invokeTool(sessionId, "request_hangup", {
      reasonKind: "handoff",
    });
    expect(isEngineError(handoff) && handoff.details).toMatchObject({
      rule: "TOOL_HANGUP_HANDOFF_GUARD",
    });
  });
});
