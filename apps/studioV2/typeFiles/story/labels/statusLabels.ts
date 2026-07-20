/**
 * 校验 / 保存状态 → 中文短标签。
 * 集中映射避免组件散落引擎字段名。
 */
import type {
  SavePresence,
  ValidationHealth,
} from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { ImportPrecheckVerdict } from "@studio-v2/typeFiles/story/transfer/packageTransfer";

/** 校验健康度 → UI 短文案；不暴露引擎枚举原文。 */
export function validationLabel(v: ValidationHealth): string {
  if (v === "ok") return "正常";
  if (v === "warning") return "有警告";
  return "需要处理";
}

/** 保存态 → UI 短文案；unknown 表示 mock/未接线。 */
export function saveStateLabel(s: SavePresence): string {
  if (s === "saved") return "已保存";
  if (s === "unsaved") return "未保存";
  return "未知";
}

/** 导入预检结论 → UI 短文案；决定确认步是否可点。 */
export function importVerdictLabel(v: ImportPrecheckVerdict): string {
  if (v === "ready") return "可导入";
  if (v === "ready_with_warnings") return "可导入但有警告";
  return "不可导入";
}

/** 相对时间粗展示；静态页不依赖实时时钟精度。 */
export function formatRelativeEdit(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} 天前`;
  return new Date(t).toLocaleDateString("zh-CN");
}
