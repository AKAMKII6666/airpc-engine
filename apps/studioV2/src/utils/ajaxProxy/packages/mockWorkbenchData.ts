/**
 * 工作台 / 故事包列表静态 mock。
 * 禁止在此发起 Host 写口或读写 data 目录；会话内可增（appendMockPackage），刷新丢失。
 */
import type {
  EngineeringStatusItem,
  RecentDebugSummary,
  StoryPackageSummary,
} from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/**
 * 可变 mock 列表；顺序即「最近编辑」演示序。
 * 新建故事包会 unshift，供列表分页在会话内看到新增项。
 */
export const MOCK_STORY_PACKAGES: StoryPackageSummary[] = [
  {
    packageId: "pkg_memory_bar_1",
    title: "第一章：内存条事件",
    description: "澜星姐姐托张老板回电确认内存条库存。",
    lastEditedAt: "2026-07-15T18:42:00.000Z",
    cardCount: 12,
    characterCount: 4,
    assetCount: 6,
    validation: "ok",
    saveState: "saved",
    lastExportedAt: "2026-07-14T09:10:00.000Z",
  },
  {
    packageId: "pkg_night_shift_2",
    title: "第二章：夜班交接",
    description: "夜班值班员延迟外呼用户核对交接清单。",
    lastEditedAt: "2026-07-14T21:05:00.000Z",
    cardCount: 8,
    characterCount: 3,
    assetCount: 2,
    validation: "warning",
    saveState: "unsaved",
    lastExportedAt: null,
  },
  {
    packageId: "pkg_handoff_demo",
    title: "演示：黄金交接",
    description: "用于静态验收的示例章节包。",
    lastEditedAt: "2026-07-12T11:20:00.000Z",
    cardCount: 5,
    characterCount: 2,
    assetCount: 1,
    validation: "error",
    saveState: "unknown",
    lastExportedAt: "2026-07-01T08:00:00.000Z",
  },
  {
    packageId: "pkg_quiet_prologue",
    title: "序章：静音开场",
    description: "仅 Free 通话与章节起止节点。",
    lastEditedAt: "2026-07-10T16:00:00.000Z",
    cardCount: 3,
    characterCount: 1,
    assetCount: 0,
    validation: "ok",
    saveState: "saved",
    lastExportedAt: null,
  },
];

/** 右侧工程状态 mock。 */
export const MOCK_ENGINEERING_STATUS: readonly EngineeringStatusItem[] = [
  {
    id: "schema",
    label: "Schema 校验器",
    level: "ok",
    detail: "可用 · 引擎 schema 1.0",
  },
  {
    id: "last_export",
    label: "最近导出",
    level: "ok",
    detail: "正式包导出成功",
  },
  {
    id: "open_errors",
    label: "未处理问题",
    level: "warning",
    detail: "1 个故事包有校验警告",
  },
  {
    id: "migration",
    label: "迁移需求",
    level: "ok",
    detail: "当前工作区无需迁移",
  },
];

/** 最近调试 mock；叙事摘要，非 JSON log。 */
export const MOCK_RECENT_DEBUGS: readonly RecentDebugSummary[] = [
  {
    sessionId: "dbg_mem_01",
    packageTitle: "第一章：内存条事件",
    packageId: "pkg_memory_bar_1",
    startCardTitle: "澜星姐姐开场",
    hitExitTitle: "转交张老板",
    resultLabel: "出口命中 · Effect 完成",
    at: "2026-07-15T19:01:00.000Z",
  },
  {
    sessionId: "dbg_night_02",
    packageTitle: "第二章：夜班交接",
    packageId: "pkg_night_shift_2",
    startCardTitle: "值班员回拨",
    hitExitTitle: "",
    resultLabel: "通话中断 · 未选出口",
    at: "2026-07-14T22:18:00.000Z",
  },
];

/** 按 packageId 查找 mock 包；找不到返回 undefined。 */
export function findMockPackage(
  packageId: string,
): StoryPackageSummary | undefined {
  return MOCK_STORY_PACKAGES.find((p) => p.packageId === packageId);
}

/**
 * 会话内前置一条故事包摘要；不写 data/。
 * 调用方应触发列表重渲染（本地 state 或路由跳转后 remount）。
 */
export function appendMockPackage(pkg: StoryPackageSummary): void {
  MOCK_STORY_PACKAGES.unshift(pkg);
}

/** 当前会话可见的故事包快照（浅拷贝，避免调用方原地 mutate 漏同步）。 */
export function listMockPackages(): StoryPackageSummary[] {
  return MOCK_STORY_PACKAGES.slice();
}
