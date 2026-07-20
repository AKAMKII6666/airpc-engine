/**
 * 故事包列表 / 工作台投影契约。
 * 静态页阶段由 mock 注入；不得当作 Host / 磁盘真源，主流程不手填 packageId。
 */

/** 校验健康度：ok 可继续；warning 可进编辑但导出需提示；error 禁止正式导出 */
export type ValidationHealth = "ok" | "warning" | "error";

/**
 * 本地保存提示态。
 * - saved：无未落盘编辑提示
 * - unsaved：有未保存变更（静态阶段为演示）
 * - unknown：尚未探测
 */
export type SavePresence = "saved" | "unsaved" | "unknown";

/** 故事包列表/工作台卡片投影；packageId 仅路由与高级视图使用 */
export type StoryPackageSummary = {
  /** 系统生成的包键；UI 主列表不作为主信息展示，仅路由与高级视图使用 */
  packageId: string;
  /** 人类可读标题 */
  title: string;
  /** 简短描述；空串表示无描述，不是 null */
  description: string;
  /** 最近编辑时间，ISO-8601；仅 UI 投影 */
  lastEditedAt: string;
  /** CallCard 数量（含起止等节点，按编辑器计数口径） */
  cardCount: number;
  /** 包内关联角色数量 */
  characterCount: number;
  /** 资源引用数量；不含二进制本体 */
  assetCount: number;
  /** 校验健康度；由预检/mock 投影，非引擎运行时真源 */
  validation: ValidationHealth;
  /** 本地保存提示；静态阶段恒为 mock */
  saveState: SavePresence;
  /** 最近导出时间 ISO-8601；null 表示从未导出 */
  lastExportedAt: string | null;
};

/** 工程状态条条目：影响创作/导出的关键提示，不做监控大屏 */
export type EngineeringStatusItem = {
  /** 稳定键，仅代码用 */
  id: string;
  /** 人话标签 */
  label: string;
  /** 状态等级；error/warning 需可行动 */
  level: ValidationHealth;
  /** 一行说明；勿塞 Zod 原文 */
  detail: string;
};

/** 最近调试摘要：叙事级，非 raw log */
export type RecentDebugSummary = {
  /** 调试会话展示键；系统生成 */
  sessionId: string;
  /** 故事包标题（投影，非 packageId） */
  packageTitle: string;
  /** 路由用包键；界面次要展示 */
  packageId: string;
  /** 起始卡人类标题 */
  startCardTitle: string;
  /** 命中出口人类名；空串表示未命中 */
  hitExitTitle: string;
  /** 执行结果人话 */
  resultLabel: string;
  /** 时间 ISO-8601 */
  at: string;
};
