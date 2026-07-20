import type { ValidationHealth } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import styles from "../WorkbenchShell.module.scss";

/** 校验态角标样式：与 shell 主题 token 一致。 */
export function workbenchBadgeClass(v: ValidationHealth): string {
  if (v === "ok") return styles.badgeOk;
  if (v === "warning") return styles.badgeWarn;
  return styles.badgeErr;
}
