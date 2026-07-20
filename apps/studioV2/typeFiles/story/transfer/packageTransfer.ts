/**
 * 导入预检 / 导出摘要投影契约。
 * 静态页用人话展示兼容性；禁止把 Zod 错误原文作为主界面。
 */

import type { ValidationHealth } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/** 导入预检结论分级：决定确认步是否可点「导入」 */
export type ImportPrecheckVerdict = "ready" | "ready_with_warnings" | "blocked";

/** 导入预检报告投影；确认步只读，不写工程 */
export type ImportPrecheckReport = {
  /** 故事包人类标题 */
  packageTitle: string;
  /** 内容 schema 版本字符串；展示用人话，不要求用户编辑 */
  schemaVersion: string;
  /** CallCard 数量；含起止节点，按编辑器计数口径 */
  cardCount: number;
  /** 包内关联角色数量 */
  characterCount: number;
  /** 资源引用数量；不含二进制本体 */
  assetCount: number;
  /** 是否缺资源；缺资源可不挡导入，但挡正式导出 */
  missingAssets: boolean;
  /** 是否存在未知 effect */
  unknownEffects: boolean;
  /** 是否存在不可达卡片 */
  unreachableCards: boolean;
  /** 是否与工作区 ID 冲突 */
  idConflict: boolean;
  /** 是否需要迁移后才能导入 */
  needsMigration: boolean;
  /** 综合结论 */
  verdict: ImportPrecheckVerdict;
  /** 人话提示列表；空数组表示无额外说明 */
  messages: string[];
};

/** 导出用途：正式包禁 error；debug/source 可作排查出口 */
export type ExportKind = "formal" | "debug" | "source";

/** 导出前摘要投影；error 列表非空时正式导出禁用 */
export type ExportSummary = {
  /** 目标包键；路由/命令用，主摘要标题用 packageTitle */
  packageId: string;
  /** 故事包人类标题 */
  packageTitle: string;
  /** 故事包版本展示串 */
  packageVersion: string;
  /** CallCard 数量；含起止节点，按编辑器计数口径 */
  cardCount: number;
  /** 包内关联角色数量 */
  characterCount: number;
  /** 资源引用数量；不含二进制本体 */
  assetCount: number;
  /** 章节结束配置摘要；人话 */
  chapterEndSummary: string;
  /** 起点卡人类标题 */
  startCardTitle: string;
  /** 校验健康度；error 时禁止正式导出 */
  validation: ValidationHealth;
  /** 警告人话；可导出但需展示 */
  warnings: string[];
  /** 错误人话；正式导出禁用 */
  errors: string[];
};
