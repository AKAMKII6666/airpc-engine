/**
 * 模块名称：chapterId 解析（迁移期兼容 packageId 字段）
 */
export function resolveChapterId(
	row: Record<string, unknown> | null | undefined,
	fallback = "",
): string {
	if (!row) return fallback;
	if (typeof row.chapterId === "string" && row.chapterId) {
		return row.chapterId;
	}
	if (typeof row.packageId === "string" && row.packageId) {
		return row.packageId;
	}
	return fallback;
}
