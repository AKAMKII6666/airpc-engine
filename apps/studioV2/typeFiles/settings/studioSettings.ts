/**
 * 设置页与校验报告投影。
 * 设置只影响 Studio 工作偏好；不编辑剧情内容、不改引擎语义。
 */

/** 设置左侧分类键 */
export type SettingsCategoryId =
  | "appearance"
  | "editor"
  | "debugger"
  | "import_export"
  | "schema"
  | "advanced";

/** Schema / 引擎兼容态人话枚举 */
export type SchemaCompatLevel =
  | "compatible"
  | "needs_migration"
  | "studio_stale"
  | "engine_stale"
  | "unknown_fields";

/** 校验问题严重度 */
export type ValidationIssueSeverity = "error" | "warning" | "hint";

/** 设置分类导航项 */
export type SettingsNavItem = {
  /** 分类键 */
  id: SettingsCategoryId;
  /** 中文标签 */
  label: string;
};

/** Schema 与引擎状态区投影 */
export type SchemaEngineStatus = {
  /** Studio schema 版本展示串 */
  studioSchemaVersion: string;
  /** 引擎 schema 版本展示串 */
  engineSchemaVersion: string;
  /** 兼容态 */
  compat: SchemaCompatLevel;
  /** 可用 effect 类型人话列表 */
  availableEffects: readonly string[];
  /** 可用 CallCard 类型人话列表 */
  availableCardKinds: readonly string[];
  /** 最近同步时间 ISO-8601；null 表示尚未同步 */
  lastSyncedAt: string | null;
};

/** 单条校验问题；须带定位与建议，禁止只贴 Zod 原文 */
export type ValidationIssue = {
  /** 稳定键 */
  id: string;
  /** 严重度 */
  severity: ValidationIssueSeverity;
  /** 问题说明（人话） */
  title: string;
  /** 影响范围 */
  impact: string;
  /** 建议处理 */
  suggestion: string;
  /**
   * 跳转目标：故事卡路由或资源页路径。
   * 空串表示本步仅展示、无跳转。
   */
  locateHref: string;
  /** 跳转按钮文案；空串时不渲染按钮 */
  locateLabel: string;
};

/** 外观偏好投影（静态可切换本地态，不持久化） */
export type AppearancePrefs = {
  /** 主题；本步仅 dark，不做浅色落地 */
  theme: "dark";
  /** 画布点阵强度 0–100 */
  gridStrength: number;
  /** 连线动画开关 */
  edgeAnimation: boolean;
  /** 高亮强度 0–100 */
  highlightStrength: number;
};

/** 编辑器偏好；禁止泳道相关项 */
export type EditorPrefs = {
  /** 默认缩放百分比，100 = 1x */
  defaultZoomPercent: number;
  /** 是否显示小地图 */
  showMinimap: boolean;
  /** 是否默认打开校验浮窗 */
  showValidationFloat: boolean;
  /** 是否自动保存 */
  autoSave: boolean;
  /** 自动保存间隔秒；autoSave=false 时忽略 */
  autoSaveIntervalSec: number;
  /** 新卡片默认类型人话标签 */
  defaultCardKindLabel: string;
};

/** 调试器默认偏好；不改变引擎语义 */
export type DebuggerPrefs = {
  /** 默认用户档案昵称；空串表示未设 */
  defaultUserName: string;
  /** 默认是否重置状态 */
  defaultResetStory: boolean;
  /** 默认是否展开高级日志抽屉 */
  showAdvancedLogs: boolean;
  /** 时间推进步长（秒） */
  clockStepSec: number;
  /** 调试记录保留条数上限 */
  recordRetainCount: number;
};

/** 导入导出偏好 */
export type ImportExportPrefs = {
  /** 默认导出类型人话 */
  defaultExportKindLabel: string;
  /** 是否导出编辑器布局元数据 */
  includeLayoutMeta: boolean;
  /** 是否包含资源文件 */
  includeAssets: boolean;
  /** 默认导出目录展示串；空串表示系统默认 */
  defaultExportDir: string;
  /** 导入时是否复制资源到资源库 */
  copyAssetsOnImport: boolean;
};
