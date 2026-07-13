/**
 * 模块名称：包元信息
 */
export const ENGINE_PACKAGE_NAME = "@airpc/rpg-engine" as const;

export function getEnginePackageName(): string {
  return ENGINE_PACKAGE_NAME;
}
