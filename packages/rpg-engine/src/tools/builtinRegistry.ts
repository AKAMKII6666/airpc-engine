/**
 * 模块名称：内置 ToolRegistry（七业务 + 记忆两支）
 * description：短触发句，面向模型 FC；细则进 buildToolInstructionBlocks。
 * 真源在此，不读 data/tools/registry.json。
 */
import { jsonSchemaForTool } from "./schemas/toolInputSchemas.js";
import type { ToolDefinition } from "./types.js";

export const BUILTIN_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    toolId: "refer_to_expert",
    displayName: "安排专家回电",
    description:
      "仅在已口头表示会让更合适的人过一会儿回电、并走「安排回电」路径时调用。" +
      "须提供 target_agent_id、对方接通的 card_id 与 package_id（故事章 chapterId）；topic_hint 简述话题。" +
      "与报号路径互斥：已口播号码则勿调本工具。通话中只登记出口候选，挂机后才解锁并调度来电。",
    inputSchema: jsonSchemaForTool("refer_to_expert"),
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "share_expert_number",
    displayName: "已口播专家号码",
    description:
      "仅在已向用户口播专家号码（报号路径）后调用；解锁对方拨号，不安排回电。" +
      "须提供 target_agent_id；topic_hint 简述话题。" +
      "与安排回电路径互斥。通话中只登记候选，挂机后解锁。",
    inputSchema: jsonSchemaForTool("share_expert_number"),
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "schedule_reminder_call",
    displayName: "预约回电提醒",
    description:
      "仅在自由通话卡中，当用户明确要求「过 X 分钟/小时后再打来提醒…」时调用（一次性延迟外呼）。" +
      "只需提供 delay_minutes 或 delay_hours（二选一）与 topic_hint；回拨目标由当前自由通话卡自动决定，禁止自行填写故事章或通话卡目标。" +
      "不支持「明天早上」等未给出具体延迟的模糊预约。固定每天/每周钟点请用 schedule_recurring_call。" +
      "通话中只登记，挂机后写入调度。",
    inputSchema: jsonSchemaForTool("schedule_reminder_call"),
    allowedCardKinds: ["free"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "schedule_recurring_call",
    displayName: "登记重复外呼",
    description:
      "仅当用户要每天/每周固定钟点重复外呼提醒时调用。" +
      "须提供 schedule_card_id，或同时提供 card_id+package_id（故事章 chapterId）；hour（0–23）、schedule_mode（daily|weekly）；weekly 传 weekdays。" +
      "「过 X 分钟/小时打给我」用 schedule_reminder_call，勿用本工具。" +
      "通话中只登记，挂机后写入 recurring 意图。",
    inputSchema: jsonSchemaForTool("schedule_recurring_call"),
    // Story 出口仍可能写 effect；validatePackage 对 StoryCard 上 recurring 报 error
    allowedCardKinds: ["free", "schedule"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "record_shared_secret",
    displayName: "登记共同秘密",
    description:
      "仅当用户明确要建立「只有我们知道」的秘密、且你已口头确认守密时调用。" +
      "须提供 label（短代号）；recall_hint 写下次如何自然提起，禁止写入完整秘密正文。" +
      "普通闲聊无秘密仪式时勿调。通话中只登记，挂机后写入记忆摘要。",
    inputSchema: jsonSchemaForTool("record_shared_secret"),
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "create_research_commitment",
    displayName: "研究承诺",
    description:
      "当通答不准的事实/实时/百科等问题，且用户明确同意你去查后，须在同轮或下一轮立刻调用。" +
      "须提供 question；可选 notify_mode（next_call|intent|urgent）。" +
      "本通不会返回研究结果；禁止假装已查完或说「稍等我正在查」。" +
      "通话中只登记，挂机后写入研究承诺。",
    inputSchema: jsonSchemaForTool("create_research_commitment"),
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "record_user_name",
    displayName: "登记用户称呼",
    description:
      "仅当用户明确自报昵称/姓名、且你已口头确认要记住时调用。" +
      "须提供 nickname；可选 full_name。未说名字或仅有配置备用称呼时勿调；禁止编造。" +
      "通话中只登记，挂机后更新用户档案。",
    inputSchema: jsonSchemaForTool("record_user_name"),
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: false,
    behavior: "register_exit",
  },
  {
    toolId: "search_memory",
    displayName: "搜索记忆",
    description:
      "检索与当前角色相关的历史记忆短列表（字面 FTS，非向量）。" +
      "须提供 text_query，或 from/to 时间窗（至少一个）；可选 kinds、max_results（上限 10）。" +
      "提及「N 年前」时先估 from/to 再带 text_query；先本工具看摘要，不够再 get_memory_by_id；空结果须承认没查到或换词，禁止假装记得。",
    inputSchema: jsonSchemaForTool("search_memory"),
    allowedCardKinds: ["free", "story"],
    allowedInPlayback: true,
    behavior: "session_local",
  },
  {
    toolId: "get_memory_by_id",
    displayName: "按 id 取记忆",
    description:
      "在 search_memory 返回的条目 id 上取单条正文（有长度上限）。" +
      "须提供 entry_id。先 search 再本工具；空结果勿编造。只读，不写库、不登记出口。",
    inputSchema: jsonSchemaForTool("get_memory_by_id"),
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
