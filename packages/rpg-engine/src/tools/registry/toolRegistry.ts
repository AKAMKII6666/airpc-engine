/**
 * 模块名称：统一 Tool Registry
 * 模块说明：合并内置、电话壳、L1 与宿主注入工具；引擎不扫描插件目录。
 */
import { BUILTIN_TOOL_DEFINITIONS } from "./builtinRegistry.js";
import { createHash } from "node:crypto";
import type {
  RegisteredTool,
  ToolDefinition,
  ToolRegistry,
} from "../types.js";

export const REQUEST_HANGUP_TOOL_ID = "request_hangup";

export const REQUEST_HANGUP_TOOL_DEFINITION: ToolDefinition = {
  toolId: REQUEST_HANGUP_TOOL_ID,
  displayName: "请求主动挂机",
  description:
    "当当前角色应主动结束本通电话时调用。reasonKind 必须区分自然道别、策略终止或引荐完成；调用后电话壳执行断线。",
  inputSchema: {
    type: "object",
    properties: {
      reasonKind: {
        type: "string",
        enum: ["natural", "policy", "handoff"],
        description: "natural=自然道别；policy=策略终止；handoff=引荐完成。",
      },
      reason: {
        type: "string",
        description: "可选，角色主动挂机的简短原因。",
      },
    },
    required: ["reasonKind"],
    additionalProperties: false,
  },
  allowedCardKinds: ["free", "story", "schedule"],
  allowedInPlayback: false,
  behavior: "shell_control",
};

function builtinRegistrations(): RegisteredTool[] {
  return BUILTIN_TOOL_DEFINITIONS.map(function (definition) {
    return {
      definition,
      source: {
        kind: "builtin" as const,
        providerId: "rpg-engine",
        displayName: "引擎内置",
      },
      inheritByDefault: true,
    };
  });
}

function shellRegistrations(): RegisteredTool[] {
  return [{
    definition: REQUEST_HANGUP_TOOL_DEFINITION,
    source: {
      kind: "shell",
      providerId: "phone-shell",
      displayName: "通话控制",
    },
    inheritByDefault: true,
  }];
}

function registryRevision(registrations: readonly RegisteredTool[]): string {
  const canonical = registrations
    .map(function (item) {
      return JSON.stringify({
        source: item.source,
        inheritByDefault: item.inheritByDefault,
        definition: item.definition,
      });
    })
    .sort()
    .join("|");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

/** 创建不可变 Registry；toolId 冲突直接拒绝启动。 */
export function createToolRegistry(
  extra: readonly RegisteredTool[] = [],
): ToolRegistry {
  const registrations = [
    ...builtinRegistrations(),
    ...shellRegistrations(),
    ...extra,
  ];
  const byId = new Map<string, RegisteredTool>();
  for (const registration of registrations) {
    const toolId = registration.definition.toolId.trim();
    if (!toolId) throw new Error("toolId_required");
    if (registration.source.kind === "plugin") {
      const expectedPrefix = `plugin:${registration.source.providerId}:`;
      const localToolId = toolId.slice(expectedPrefix.length);
      if (
        !toolId.startsWith(expectedPrefix) ||
        !/^[a-z][a-z0-9_]{1,63}$/.test(localToolId)
      ) {
        throw new Error(`plugin_tool_id_invalid:${toolId}`);
      }
      if (registration.inheritByDefault) {
        throw new Error(`plugin_tool_cannot_inherit:${toolId}`);
      }
    }
    if (byId.has(toolId)) throw new Error(`toolId_conflict:${toolId}`);
    byId.set(toolId, registration);
  }
  return {
    revision: registryRevision(registrations),
    registrations: Object.freeze([...registrations]),
    byId,
  };
}

export const DEFAULT_TOOL_REGISTRY = createToolRegistry();

export function getRegisteredTool(
  registry: ToolRegistry,
  toolId: string,
): RegisteredTool | undefined {
  return registry.byId.get(toolId);
}

export function listRegisteredTools(
  registry: ToolRegistry,
): RegisteredTool[] {
  return [...registry.registrations];
}
