/**
 * 设置页与校验报告静态 mock。
 * 偏好仅本地演示态；不写盘、不改引擎语义。
 */
import type {
  AppearancePrefs,
  DebuggerPrefs,
  EditorPrefs,
  ImportExportPrefs,
  SchemaEngineStatus,
  SettingsNavItem,
  ValidationIssue,
} from "@studio-v2/typeFiles/settings/studioSettings";

/** 设置左侧分类 */
export const SETTINGS_NAV: readonly SettingsNavItem[] = [
  { id: "appearance", label: "外观" },
  { id: "editor", label: "编辑器" },
  { id: "debugger", label: "调试器" },
  { id: "import_export", label: "导入导出" },
  { id: "schema", label: "Schema 与引擎" },
  { id: "advanced", label: "高级" },
];

export const MOCK_APPEARANCE: AppearancePrefs = {
  theme: "dark",
  gridStrength: 40,
  edgeAnimation: true,
  highlightStrength: 70,
};

export const MOCK_EDITOR_PREFS: EditorPrefs = {
  defaultZoomPercent: 100,
  showMinimap: false,
  showValidationFloat: true,
  autoSave: true,
  autoSaveIntervalSec: 30,
  defaultCardKindLabel: "剧情通话卡",
};

export const MOCK_DEBUGGER_PREFS: DebuggerPrefs = {
  defaultUserName: "测试用户 A",
  defaultResetStory: true,
  showAdvancedLogs: false,
  clockStepSec: 60,
  recordRetainCount: 20,
};

export const MOCK_IMPORT_EXPORT_PREFS: ImportExportPrefs = {
  defaultExportKindLabel: "正式故事包",
  includeLayoutMeta: true,
  includeAssets: true,
  defaultExportDir: "",
  copyAssetsOnImport: true,
};

export const MOCK_SCHEMA_STATUS: SchemaEngineStatus = {
  studioSchemaVersion: "studio-v2 / 1.0",
  engineSchemaVersion: "rpg-engine / 1.0",
  compat: "compatible",
  availableEffects: [
    "挂卡 / 卸载卡",
    "延迟外呼",
    "章节结束",
    "世界状态",
    "媒介播放（需确认）",
  ],
  availableCardKinds: ["剧情通话", "自由通话", "调度卡", "过场播放", "延迟外呼"],
  lastSyncedAt: "2026-07-15T12:00:00.000Z",
};

/** 校验报告 mock：含阻断 / 警告 / 提示 */
export const MOCK_VALIDATION_ISSUES: readonly ValidationIssue[] = [
  {
    id: "vi_err_1",
    severity: "error",
    title: "存在不可达卡片",
    impact: "正式导出已禁用；调试包仍可导出。",
    suggestion: "检查入口连线，或删除孤立卡。",
    locateHref: "/stories/pkg_handoff_demo",
    locateLabel: "打开演示包编辑器",
  },
  {
    id: "vi_warn_1",
    severity: "warning",
    title: "资源文件缺失",
    impact: "「内存条核对备忘」本地文件不在位。",
    suggestion: "在资源库补传或替换文件后再正式导出。",
    locateHref: "/assets",
    locateLabel: "打开资源库",
  },
  {
    id: "vi_warn_2",
    severity: "warning",
    title: "角色缺少默认自由通话卡",
    impact: "小雨在无剧情挂卡时无法进入 Free。",
    suggestion: "在角色库补齐默认自由通话说明。",
    locateHref: "/characters",
    locateLabel: "打开角色库",
  },
  {
    id: "vi_hint_1",
    severity: "hint",
    title: "章节结束点可补充下一章配置",
    impact: "无 next 时结束后将回 Free，属合法路径。",
    suggestion: "若需要连续章节，在结束点配置 next / activation。",
    locateHref: "/stories/pkg_memory_bar_1",
    locateLabel: "打开第一章编辑器",
  },
];
