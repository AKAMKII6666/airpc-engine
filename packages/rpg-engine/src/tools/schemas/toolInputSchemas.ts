/**
 * 模块名称：内置工具入参 Zod（与 expandExitEffects / session_local 实现对齐）
 * 需求真源：13 §7；实现真源：本文件 → toToolJsonSchema。
 * 字段 .describe 进入 inputSchema，供 Adapter / 模型读参数说明。
 */
import { z } from "zod";
import { MEMORY_SEARCH_DEFAULTS } from "../../constants.js";
import { toToolJsonSchema } from "./toToolJsonSchema.js";

export const ReferToExpertArgsSchema = z.object({
  target_agent_id: z
    .string()
    .min(1)
    .describe("目标专家 agentId，如 forest_guide"),
  card_id: z
    .string()
    .min(1)
    .describe("专家回电接通的通话卡 cardId"),
  package_id: z
    .string()
    .min(1)
    .describe("专家回电接通卡所在故事章 chapterId"),
  topic_hint: z
    .string()
    .optional()
    .describe("用户关心的话题，宜短，如「户外露营装备」"),
  delay_minutes: z
    .number()
    .nonnegative()
    .optional()
    .describe("可选，多少分钟后专家回电；缺省由系统决定"),
  referral_style: z
    .string()
    .optional()
    .describe("可选，引荐风格；固定 callback 时可填 callback"),
});

export const ShareExpertNumberArgsSchema = z.object({
  target_agent_id: z
    .string()
    .min(1)
    .describe("目标专家 agentId，如 forest_guide"),
  topic_hint: z
    .string()
    .optional()
    .describe("用户关心的话题，宜短，如「户外露营装备」"),
});

/** delay 可缺省；expand 缺省约 60 分钟 */
export const ScheduleReminderCallArgsSchema = z.object({
  card_id: z.string().min(1).describe("到点接通的通话卡 cardId"),
  package_id: z.string().min(1).describe("到点接通卡所在故事章 chapterId"),
  topic_hint: z
    .string()
    .optional()
    .describe("接通后要围绕的提醒内容，宜短，如「提醒用户收玩具」"),
  delay_minutes: z
    .number()
    .nonnegative()
    .optional()
    .describe("多少分钟后回电（与 delay_hours 二选一）"),
  delay_hours: z
    .number()
    .nonnegative()
    .optional()
    .describe("多少小时后回电（与 delay_minutes 二选一）"),
  confirm_phrase: z
    .string()
    .optional()
    .describe("可选，给用户口头确认的一句话"),
});

export const ScheduleRecurringCallArgsSchema = z
  .object({
    topic_hint: z
      .string()
      .optional()
      .describe("接通后要提醒的内容，如「叫用户起床」"),
    hour: z
      .number()
      .int()
      .min(0)
      .max(23)
      .optional()
      .describe("24 小时制小时 0～23（下午 7 点 = 19）"),
    minute: z
      .number()
      .int()
      .min(0)
      .max(59)
      .optional()
      .describe("分钟 0～59，默认 0"),
    schedule_mode: z
      .enum(["daily", "weekly"])
      .optional()
      .describe("daily=每天；weekly=每周指定日"),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .optional()
      .describe("weekly 时必填，0=周日 … 6=周六"),
    job_id: z.string().optional().describe("可选任务 id，留空则自动生成"),
    schedule_card_id: z
      .string()
      .min(1)
      .optional()
      .describe("目标 ScheduleCard id；与 card_id+package_id 二选一"),
    card_id: z
      .string()
      .min(1)
      .optional()
      .describe("目标通话卡 id（须同时给 package_id）"),
    package_id: z
      .string()
      .min(1)
      .optional()
      .describe("目标卡所在包 id（须同时给 card_id）"),
  })
  .refine(
    function (v) {
      if (v.schedule_card_id) return true;
      return Boolean(v.card_id && v.package_id);
    },
    { message: "requires schedule_card_id or card_id+package_id" },
  );

export const RecordSharedSecretArgsSchema = z.object({
  label: z
    .string()
    .min(1)
    .describe("秘密的简短代号，如「小卖部暗号」"),
  recall_hint: z
    .string()
    .optional()
    .describe("下次可如何自然提起（不含完整秘密内容），如「提到公园秋千时」"),
});

export const CreateResearchCommitmentArgsSchema = z.object({
  question: z
    .string()
    .min(1)
    .describe("用户提出的原问题，简短准确"),
  notify_mode: z
    .enum(["next_call", "intent", "urgent"])
    .optional()
    .describe(
      "next_call=下次打来再提；intent=查完后主动回电；urgent=很急须尽快回电",
    ),
});

export const RecordUserNameArgsSchema = z.object({
  nickname: z.string().min(1).describe("日常昵称，如「豆豆」"),
  full_name: z
    .string()
    .optional()
    .describe("可选，正式姓名，如「李小明」"),
});

export const SearchMemoryArgsSchema = z
  .object({
    text_query: z
      .string()
      .optional()
      .describe("字面检索关键词，如「上次露营」"),
    from: z.string().optional().describe("时间窗起点 ISO-8601，可选"),
    to: z.string().optional().describe("时间窗终点 ISO-8601，可选"),
    kinds: z
      .array(
        z.enum([
          "call_summary",
          "vignette",
          "beat",
          "semantic",
          "rollup",
        ]),
      )
      .optional()
      .describe("可选记忆种类过滤"),
    max_results: z
      .number()
      .int()
      .positive()
      .max(MEMORY_SEARCH_DEFAULTS.hardMaxResults)
      .optional()
      .describe("返回条数上限，默认 5，硬上限 10"),
  })
  .refine(
    function (v) {
      return Boolean(
        (v.text_query && v.text_query.trim()) || v.from || v.to,
      );
    },
    { message: "text_query or from/to time window required" },
  );

export const GetMemoryByIdArgsSchema = z
  .object({
    entry_id: z
      .string()
      .min(1)
      .optional()
      .describe("search_memory 返回的条目 id"),
    id: z
      .string()
      .min(1)
      .optional()
      .describe("同 entry_id，兼容别名"),
  })
  .refine(
    function (v) {
      return Boolean(v.entry_id || v.id);
    },
    { message: "entry_id required" },
  );

/** toolId → Zod；invoke 与 Registry 共用 */
export const TOOL_INPUT_SCHEMAS: Record<string, z.ZodType> = {
  refer_to_expert: ReferToExpertArgsSchema,
  share_expert_number: ShareExpertNumberArgsSchema,
  schedule_reminder_call: ScheduleReminderCallArgsSchema,
  schedule_recurring_call: ScheduleRecurringCallArgsSchema,
  record_shared_secret: RecordSharedSecretArgsSchema,
  create_research_commitment: CreateResearchCommitmentArgsSchema,
  record_user_name: RecordUserNameArgsSchema,
  search_memory: SearchMemoryArgsSchema,
  get_memory_by_id: GetMemoryByIdArgsSchema,
};

export function getToolInputSchema(toolId: string): z.ZodType | undefined {
  return TOOL_INPUT_SCHEMAS[toolId];
}

/** 预计算 JSON Schema，挂到 ToolDefinition.inputSchema */
export function jsonSchemaForTool(toolId: string): unknown {
  const schema = TOOL_INPUT_SCHEMAS[toolId];
  if (!schema) {
    return { type: "object", properties: {} };
  }
  return toToolJsonSchema(schema);
}
