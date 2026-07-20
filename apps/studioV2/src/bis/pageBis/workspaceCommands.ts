/**
 * 编辑器命令入口（工作区级）。
 * 具体画布 / 保存事务在后续任务落地；本步只保证目录与依赖方向就位。
 */
export type StudioCommandResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * 重命名工作区标题（纯 store 写口，无 Host / 网络）。
 * @param nextTitle 展示名；空串拒绝，避免主流程手填内部 ID 混入
 */
export function renameWorkspaceTitle(
  nextTitle: string,
  apply: (title: string) => void,
): StudioCommandResult {
  const trimmed = nextTitle.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "标题不能为空" };
  }
  apply(trimmed);
  return { ok: true };
}
