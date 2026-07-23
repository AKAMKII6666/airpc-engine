/**
	* 模块名称：Sqlite Memory 纯辅助（截断 / FTS 转义 / 结果钳制）
	*/
import { MEMORY_SEARCH_DEFAULTS } from "@airpc/rpg-engine";

export function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, max - 1) + "…";
}

export function clampMaxResults(n: number): number {
	if (!Number.isFinite(n) || n < 1) {
		return MEMORY_SEARCH_DEFAULTS.defaultMaxResults;
	}
	return Math.min(Math.floor(n), MEMORY_SEARCH_DEFAULTS.hardMaxResults);
}

export function escapeFtsQuery(raw: string): string {
	const trimmed = raw.trim();
	const safe = trimmed.replace(/["'^:*(){}[\]\\]/g, " ").trim();
	if (!safe) return "";
	// unicode61 将每个 CJK 字视为独立 token；无空格短语会当作单 token 而零命中
	const spaced = safe
		.replace(/([\u3400-\u9FFF\uF900-\uFAFF])/g, " $1 ")
		.replace(/\s+/g, " ")
		.trim();
	if (!spaced) return "";
	return `"${spaced}"`;
}

export function pad2(n: number): string {
	return String(n).padStart(2, "0");
}
