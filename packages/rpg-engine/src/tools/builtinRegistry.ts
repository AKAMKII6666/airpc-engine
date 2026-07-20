/**
 * 模块名称：内置 ToolRegistry（七业务 + 记忆两支）
 */
import type { ToolDefinition } from "./types.js";

export const BUILTIN_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    toolId: "refer_to_expert",
    displayName: "安排专家回电",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "share_expert_number",
    displayName: "已口播专家号码",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "schedule_reminder_call",
    displayName: "预约回电提醒",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "schedule_recurring_call",
    displayName: "登记重复外呼",
    // Story 出口仍可能写 effect；validatePackage 对 StoryCard 上 recurring 报 error
    allowedCardKinds: ["free", "schedule"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "record_shared_secret",
    displayName: "登记共同秘密",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "create_research_commitment",
    displayName: "研究承诺",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "record_user_name",
    displayName: "登记用户称呼",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "search_memory",
    displayName: "搜索记忆",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: true,
    behavior: "session_local",
  },
  {
    toolId: "get_memory_by_id",
    displayName: "按 id 取记忆",
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: true,
    behavior: "session_local",
  },
];

export function getBuiltinTool(toolId: string): ToolDefinition | undefined {
  return BUILTIN_TOOL_DEFINITIONS.find(function (t) {
    return t.toolId === toolId;
  });
}

export function listBuiltinTools(): ToolDefinition[] {
  return [...BUILTIN_TOOL_DEFINITIONS];
}
