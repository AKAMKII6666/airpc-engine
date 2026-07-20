/**
 * 设置 / 校验报告 → 中文短标签。
 */
import type {
  SchemaCompatLevel,
  ValidationIssueSeverity,
} from "@studio-v2/typeFiles/settings/studioSettings";

/** Schema 兼容态 → 人话状态文案 */
export function schemaCompatLabel(c: SchemaCompatLevel): string {
  if (c === "compatible") return "已兼容";
  if (c === "needs_migration") return "需要迁移";
  if (c === "studio_stale") return "Studio 版本过旧";
  if (c === "engine_stale") return "引擎版本过旧";
  return "存在未知字段";
}

/** 校验问题严重度 → UI 分组标题 */
export function issueSeverityLabel(s: ValidationIssueSeverity): string {
  if (s === "error") return "阻断错误";
  if (s === "warning") return "警告";
  return "提示";
}
