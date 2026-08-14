/**
 * 按本通开放 toolId 拼装 FC 剧本块（进 softContext，与 description 双通道）。
 * 交叉互斥句仅在相关工具同时开放时注入；中性人称「用户」。
 */

type OpenSet = ReadonlySet<string>;

type BlockBuilder = (open: OpenSet) => string | null;

const BLOCK_BUILDERS: BlockBuilder[] = [
  buildExpertBlockIfOpen,
  buildReminderBlockIfOpen,
  buildRecurringBlockIfOpen,
  buildSharedSecretBlockIfOpen,
  buildResearchBlockIfOpen,
  buildUserNameBlockIfOpen,
  buildMemoryBlockIfOpen,
  buildBaziBlockIfOpen,
];

export function buildToolInstructionBlocks(
  allowedToolIds: readonly string[],
): string[] {
  if (allowedToolIds.length === 0) return [];
  const open: OpenSet = new Set(allowedToolIds);
  const sections: string[] = [];
  for (const build of BLOCK_BUILDERS) {
    const section = build(open);
    if (section) sections.push(section);
  }
  if (sections.length === 0) return [];
  return [`[tools]\n${sections.join("\n\n")}`];
}

function buildExpertBlockIfOpen(open: OpenSet): string | null {
  const hasShare = open.has("share_expert_number");
  const hasRefer = open.has("refer_to_expert");
  if (!hasShare && !hasRefer) return null;
  const hasResearch = open.has("create_research_commitment");
  const lines = ["# 垂直领域专家介绍（Function Calling）"];
  if (hasResearch) {
    lines.push(
      "当用户问题明显超出你的专长、且可引荐对应专家时，**必须先走本段工具**，**不要**调用 `create_research_commitment`。",
      "仅当没有可引荐的专家时，才考虑研究回拨。",
    );
  }
  lines.push("需要引荐专家时，**同一次通话二选一**：");
  if (hasShare) {
    lines.push(
      "",
      "**路径 A · 报号**：口播专家电话号码后，调用 `share_expert_number`（`target_agent_id`；`topic_hint` 简述话题）。**不要**同时再走安排回电路径。",
    );
  }
  if (hasRefer) {
    lines.push(
      "",
      "**路径 B · 安排回电**：",
      "1. 先口语含糊回应，表示会让更合适的人过一会儿打给用户（用「一会儿」「过几分钟」等模糊说法，不要承诺具体分钟数）；",
      "2. 调用 `refer_to_expert`（`target_agent_id` + `card_id` + `package_id`（故事章 chapterId）+ `topic_hint`）；",
      "3. 说完安排话术后可自然结束本通（挂机由用户或壳侧处理；工具只登记候选，挂机后才解锁并调度）。",
    );
  }
  if (hasShare && hasRefer) {
    lines.push(
      "",
      "已走路径 A 后不可再走路径 B；已登记回电后不可再报号登记。",
    );
  }
  return lines.join("\n");
}

function buildReminderBlockIfOpen(open: OpenSet): string | null {
  if (!open.has("schedule_reminder_call")) return null;
  const hasRecurring = open.has("schedule_recurring_call");
  const lines = [
    "# 口头预约回电（Function Calling）",
    "本工具只在自由通话卡开放；当用户**明确**说「过 X 分钟/小时打给我」「X 分钟后提醒我…」等，且你已理解提醒内容时：",
    "1. 先用口语确认时间和提醒事项；",
    "2. 再调用 `schedule_reminder_call`（只传 `topic_hint`；`delay_minutes` 或 `delay_hours` 二选一；**不要**传 `card_id`、`package_id` 或任何故事章/通话卡目标）。",
    "不支持「明天早上」等未给出具体延迟的模糊预约（可引导改成「多少分钟后/小时后」）。",
    "普通闲聊、没有明确回电时间的要求，**不要**调用该工具。",
  ];
  if (hasRecurring) {
    lines.push(
      "固定每天/每周钟点提醒 → 用 `schedule_recurring_call`，**不要**用本工具。",
    );
  }
  lines.push(
    "调用成功后用一句话告诉用户「好的，到点我会打电话提醒你…」，然后继续聊天或等用户挂机。",
    "同一通话中提醒已登记成功后，用户只是确认或告别时，**不要**再次调用本工具。",
    "如果电话壳开放 `request_hangup`，用户告别或你准备结束本通时，应调用 `request_hangup` 主动挂断。",
    "通话中只登记候选；挂机后才写入调度。",
  );
  return lines.join("\n");
}

function buildRecurringBlockIfOpen(open: OpenSet): string | null {
  if (!open.has("schedule_recurring_call")) return null;
  const hasReminder = open.has("schedule_reminder_call");
  const lines = [
    "# 重复定时回电（Function Calling）",
    "当用户**明确**要「每天/每周 X 点打电话提醒…」「固定时间叫醒」等**重复**安排时：",
    "1. 先口语确认：提醒内容、是每天还是每周哪几天、具体钟点（24 小时制心里换算好）；",
    "2. 时间消歧：**只要用户说的是 1～12 点且没说明上午/下午/早上/晚上/凌晨**，必须先问「是上午还是下午？」——包括「七点半叫我起床」也**不能**默认早上；",
    "3. 若时间与场景明显奇怪（如凌晨 3 点叫起床），可以好奇地追问一句，但仍需得到明确钟点后再登记；",
    "4. 确认无误后调用 `schedule_recurring_call`（`topic_hint`；`hour` 用 0～23；`minute`；`schedule_mode` 为 daily 或 weekly；weekly 时传 `weekdays` 0=周日…6=周六；须 `schedule_card_id` 或 `card_id`+`package_id`（故事章 chapterId））。",
  ];
  if (hasReminder) {
    lines.push(
      "「过 X 分钟/小时打给我」→ 用 `schedule_reminder_call`，**不要**用本工具。",
    );
  }
  lines.push(
    "调用成功后口头确认会在对应时间打电话提醒。",
    "通话中只登记候选；挂机后写入 recurring 意图。",
  );
  return lines.join("\n");
}

function buildSharedSecretBlockIfOpen(open: OpenSet): string | null {
  if (!open.has("record_shared_secret")) return null;
  return [
    "# 共同秘密（Function Calling）",
    "当用户**明确**说「这是我们的秘密」「不要告诉别人」「只有我们知道」等，且你已口头确认要帮他守住时：",
    "1. 先用口语确认会守住这个小秘密；",
    "2. 再调用 `record_shared_secret`（`label` 简短代号；`recall_hint` 写下次可如何自然提起，**不要写完整秘密内容**）。",
    "普通聊天、没有建立秘密仪式时，**不要**调用该工具。",
    "已有秘密只在内心依据注入的提示回忆，不要当众复述细节。",
    "通话中只登记；挂机后写入记忆摘要。",
  ].join("\n");
}

function buildResearchBlockIfOpen(open: OpenSet): string | null {
  if (!open.has("create_research_commitment")) return null;
  const expertOpen =
    open.has("share_expert_number") || open.has("refer_to_expert");
  const hasReminder = open.has("schedule_reminder_call");
  const lines = ["# 研究回拨（Function Calling，须用户明确同意）"];
  if (expertOpen) {
    lines.push(
      "**专家介绍优先**：问题若可引荐对应专家，**必须先走专家介绍**，**禁止**调用 `create_research_commitment`。",
      "**仅当**问题超出专长、且**没有**可匹配专家时，才用研究回拨。",
    );
  }
  lines.push(
    "你已具备**挂机后联网查资料**的能力：当通不能当场查完，但可以登记任务，挂机后由系统查好再通过下次通话或回电告知。",
    "当用户问事实/实时/价格/百科/技术方案等你**当通答不准或答不了**的问题，且同意你去查（如「帮我查」「好你查吧」「查到了打给我」）→ **立刻**调用 `create_research_commitment`，`question` 写清原话。",
    "**口头答应去查后，必须在同轮或下一轮调用工具**；禁止只说不调。",
    "**禁止**在未登记或未查完时说「嗯查了」「我查到了」「已经查好了」。",
    "**禁止**说「稍等一下我在查」「查完马上告诉你」（研究在**挂机后**执行，通话中不会出结果）。",
    "**禁止**说「我没法查」「你自己上网搜」——应登记研究，而不是推给用户自己查。",
    "**禁止**未经同意自行创建；**禁止**通话中阻塞等待研究结果。",
    "`notify_mode` 规则：",
    "- `next_call`（默认）：仅同意去查，未说要打电话；",
    "- `intent`：明确说「查好了打给我 / 打电话告诉我」（无「马上/立刻/立即」）；",
    "- `urgent`：含「马上/立刻/立即回拨/回电/打电话」或强调必须尽快电话通知 → **必须用 urgent**；",
  );
  if (hasReminder) {
    lines.push(
      "「过 X 分钟/小时打给我」→ 用 `schedule_reminder_call`，**不要**建研究任务。",
    );
  }
  lines.push(
    "登记后口语确认会去查；若 `intent`/`urgent` 可说查好会打电话（忙线可能稍晚）。",
    "通话中只登记候选；挂机后写入研究承诺。",
  );
  return lines.join("\n");
}

function buildUserNameBlockIfOpen(open: OpenSet): string | null {
  if (!open.has("record_user_name")) return null;
  return [
    "# 记住名字（Function Calling）",
    "当对方**明确**告诉你叫什么（如「我叫豆豆」），且你已口头确认要记下来时：",
    "1. 先用口语认真回应（如「好，我记住啦」）；",
    "2. 调用 `record_user_name`（`nickname` 日常昵称；可选 `full_name` 正式姓名）。",
    "对方还没说名字、或只是配置的备用称呼时，**不要**调用。",
    "不要编造名字。",
    "通话中只登记；挂机后更新用户档案。",
  ].join("\n");
}

function buildMemoryBlockIfOpen(open: OpenSet): string | null {
  const hasSearch = open.has("search_memory");
  const hasGet = open.has("get_memory_by_id");
  if (!hasSearch && !hasGet) return null;
  const lines = ["# 记忆召回（Function Calling，只读）"];
  if (hasSearch) {
    lines.push(
      "需要回忆往事时先调用 `search_memory`（`text_query` 和/或 `from`/`to` 至少一个）。",
      "提及「N 年前」时先估时间窗再检索。",
    );
  }
  if (hasGet) {
    lines.push(
      "摘要不够时，用 `get_memory_by_id` 取本通 `search_memory` 返回的 `entry_id` 正文；不要猜 id。",
    );
  }
  lines.push(
    "空结果须承认没查到或换词；禁止假装记得。",
    "只读：不写库、不登记出口。",
  );
  return lines.join("\n");
}

function buildBaziBlockIfOpen(open: OpenSet): string | null {
  if (!open.has("compute_bazi_chart")) return null;
  return [
    "# 八字排盘（Function Calling · 角色专属）",
    "当用户问八字、生日、时辰、五行、命盘、日主等，先确认：",
    "1. 生日历法是公历/阳历还是农历/阴历；",
    "2. 出生日期 `birth_date`，格式 YYYY-MM-DD；",
    "3. 出生时间 `birth_time` 可选；用户不知道时不要追到尴尬，也不要编造。",
    "信息足够后，**必须**调用 `compute_bazi_chart`；禁止自行编造天干地支、五行或时柱。",
    "工具返回后，用角色口吻做娱乐性、启发式解读；若 `hourKnown=false`，要说明缺少时柱所以只看三柱。",
    "禁止断生死、疾病灾祸、考试/投资/婚姻等重大结果；不可替用户做重大决定。",
  ].join("\n");
}
