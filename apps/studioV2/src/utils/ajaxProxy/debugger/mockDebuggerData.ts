/**
 * 调试器静态会话 mock。
 * 叙事布局验收用；不接真实 session / Host。
 */
import type {
  DebugAdvancedSnapshot,
  DebugCallRunView,
  DebugEffectItem,
  DebugExitHitView,
  DebugRoleBoardItem,
  DebugSceneSetup,
  DebugTimelineItem,
} from "@studio-v2/typeFiles/debugger/debugSessionView";

/** 顶部/左侧场景设置 */
export const MOCK_DEBUG_SCENE: DebugSceneSetup = {
  packageTitle: "第一章：内存条事件",
  packageId: "pkg_memory_bar_1",
  userDisplayName: "测试用户 A",
  characterName: "澜星姐姐",
  startCardTitle: "澜星姐姐开场",
  sceneKind: "user_dial",
  useCurrentPending: true,
  resetStory: false,
};

/** 中部通话运行区 */
export const MOCK_DEBUG_CALL_RUN: DebugCallRunView = {
  characterName: "澜星姐姐",
  cardTitle: "澜星姐姐开场",
  callKind: "story",
  goalSummary: "说服用户等待张老板回电核对库存。",
  contextSummary: "用户刚挂断上一通 Free；世界状态：库存未确认。",
  userEventSummary: "用户表示「行，你让他等下打给我」。",
  replySummary: "澜星：好，我这就去跟张老板说一声。",
};

/** 出口命中叙事 */
export const MOCK_DEBUG_EXIT_HIT: DebugExitHitView = {
  exitTitle: "转交张老板",
  reason: "用户同意等待回电，并表达信任。",
  isFallback: false,
  actionLines: [
    "给张老板挂卡「张老板回拨」",
    "安排延迟外呼：约 2 分钟后外呼用户",
    "设置世界状态「库存核对中」",
  ],
};

/** Effect 执行结果列表 */
export const MOCK_DEBUG_EFFECTS: readonly DebugEffectItem[] = [
  {
    id: "fx1",
    actionLabel: "挂卡",
    targetLabel: "张老板",
    inputSummary: "卡：张老板回拨",
    status: "succeeded",
    critical: true,
    detail: "已写入角色挂卡队列",
  },
  {
    id: "fx2",
    actionLabel: "延迟外呼",
    targetLabel: "张老板 → 用户",
    inputSummary: "延迟 120 秒 · 关联 pending",
    status: "succeeded",
    critical: false,
    detail: "once intent 已登记，可提前呼入消费",
  },
  {
    id: "fx3",
    actionLabel: "世界状态",
    targetLabel: "库存核对中",
    inputSummary: "set_fact",
    status: "running",
    critical: false,
    detail: "等待确认（静态演示）",
  },
];

/** 右侧角色状态 */
export const MOCK_DEBUG_ROLE_BOARD: readonly DebugRoleBoardItem[] = [
  {
    characterName: "澜星姐姐",
    freeDialable: true,
    pendingCardTitle: "",
    pendingSource: "",
    hasOutbound: false,
    delayRemainingMs: null,
  },
  {
    characterName: "张老板",
    freeDialable: false,
    pendingCardTitle: "张老板回拨",
    pendingSource: "来自出口「转交张老板」",
    hasOutbound: true,
    delayRemainingMs: 120_000,
  },
  {
    characterName: "小雨",
    freeDialable: true,
    pendingCardTitle: "",
    pendingSource: "",
    hasOutbound: false,
    delayRemainingMs: null,
  },
];

/** 底部 WET + Effect 时间线 */
export const MOCK_DEBUG_TIMELINE: readonly DebugTimelineItem[] = [
  {
    id: "t1",
    phase: "通话",
    summary: "用户呼入澜星姐姐 · 进入「澜星姐姐开场」",
    statusLabel: "完成",
  },
  {
    id: "t2",
    phase: "WET",
    summary: "判定：用户同意等待回电 → 候选出口「转交张老板」",
    statusLabel: "完成",
  },
  {
    id: "t3",
    phase: "出口",
    summary: "命中「转交张老板」· 3 条动作待执行",
    statusLabel: "完成",
  },
  {
    id: "t4",
    phase: "Effect",
    summary: "挂卡与延迟外呼已确认；世界状态执行中",
    statusLabel: "进行中",
  },
];

/** 高级抽屉：故意不进主视图 */
export const MOCK_DEBUG_ADVANCED: DebugAdvancedSnapshot = {
  rawJson: `{
  "sessionId": "dbg_mem_01",
  "cardId": "card_lanxing_intro",
  "wet": { "selectedExitId": "exit_handoff_boss" },
  "effectPlan": { "status": "completed_with_errors" }
}`,
  logLines: [
    "beginCall ok · frozenCard=澜星姐姐开场",
    "endCall → FreeCallPostPipeline skipped (story)",
    "effect fx3 awaiting sink confirm",
  ],
};
