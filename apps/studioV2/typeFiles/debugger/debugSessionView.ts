/**
 * 调试器叙事投影：回答「这通电话如何推进」，不以 raw JSON 为主体。
 * 静态阶段全部 mock；不得假装已接 Host session 写口。
 */

/** 通话类型标签；面向创作语言 */
export type DebugCallKind =
  | "free"
  | "story"
  | "playback"
  | "delayed_outbound";

/** Effect 执行态；表达「非 fire-and-forget」 */
export type EffectRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed_continue"
  | "failed_critical";

/** 调试场景入口形态 */
export type DebugSceneKind =
  | "user_dial"
  | "agent_outbound"
  | "delayed_trigger"
  | "playback"
  | "free_fallback";

/** 场景设置投影；字段均为人类可读，禁止要求手填 sessionId */
export type DebugSceneSetup = {
  /** 当前故事包标题 */
  packageTitle: string;
  /** 路由用包键；次要展示 */
  packageId: string;
  /** 用户档案昵称 */
  userDisplayName: string;
  /** 目标角色显示名 */
  characterName: string;
  /** 起始卡标题；可由 pending 推断 */
  startCardTitle: string;
  /** 场景形态 */
  sceneKind: DebugSceneKind;
  /** 是否沿用当前挂卡状态 */
  useCurrentPending: boolean;
  /** 是否重置故事状态 */
  resetStory: boolean;
};

/** 通话运行区主投影 */
export type DebugCallRunView = {
  /** 当前角色显示名 */
  characterName: string;
  /** 当前 CallCard 标题 */
  cardTitle: string;
  /** 通话类型 */
  callKind: DebugCallKind;
  /** 本轮目标摘要 */
  goalSummary: string;
  /** 上下文摘要；空串表示暂无 */
  contextSummary: string;
  /** 用户侧输入/事件摘要 */
  userEventSummary: string;
  /** 角色回复摘要 */
  replySummary: string;
};

/** 出口命中叙事；勿只展示 exitId */
export type DebugExitHitView = {
  /** 出口人类标题 */
  exitTitle: string;
  /** 命中原因人话 */
  reason: string;
  /** 是否兜底出口 */
  isFallback: boolean;
  /** 出口动作列表（人话） */
  actionLines: readonly string[];
};

/** 单条 Effect 执行结果投影 */
export type DebugEffectItem = {
  /** 稳定键，仅列表用 */
  id: string;
  /** 动作类型人话，如「挂卡」「延迟外呼」 */
  actionLabel: string;
  /** 目标对象人话 */
  targetLabel: string;
  /** 输入摘要 */
  inputSummary: string;
  /** 执行状态 */
  status: EffectRunStatus;
  /** 是否 critical；失败可中止后续 */
  critical: boolean;
  /** 成功/失败原因；空串表示尚无 */
  detail: string;
};

/** 右侧角色挂卡/外呼状态 */
export type DebugRoleBoardItem = {
  /** 角色显示名 */
  characterName: string;
  /** 是否可自由通话 */
  freeDialable: boolean;
  /** 当前挂卡标题；空串表示无 */
  pendingCardTitle: string;
  /** 挂卡来源人话；空串表示无 */
  pendingSource: string;
  /** 是否有待外呼 */
  hasOutbound: boolean;
  /**
   * 延迟外呼剩余毫秒；null 表示无计时。
   * 仅 UI 倒计时投影，非 Host 时钟真源。
   */
  delayRemainingMs: number | null;
};

/** 底部时间线条目：WET 判定或 Effect 步骤 */
export type DebugTimelineItem = {
  /** 稳定键 */
  id: string;
  /** 阶段标签，如 WET / Effect */
  phase: string;
  /** 叙事摘要 */
  summary: string;
  /** 状态短标签 */
  statusLabel: string;
};

/** 高级抽屉内容：故意不进主视图 */
export type DebugAdvancedSnapshot = {
  /** 格式化 JSON 字符串；仅抽屉展示 */
  rawJson: string;
  /** 日志摘要行 */
  logLines: readonly string[];
};
