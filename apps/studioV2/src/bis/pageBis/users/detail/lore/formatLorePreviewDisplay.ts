/**
 * 世界背景只读展示格式化；纯函数，Client/Server 均可复制镜像。
 */
import type { LoreLocationPreviewDto } from "@studio-v2/typeFiles/library/users/loreBootstrap";

/** 地点四段拼成一行；空段跳过。 */
export function formatLoreLocationLine(
	location: LoreLocationPreviewDto | undefined,
): string | undefined {
	if (!location) {
		return undefined;
	}
	const parts = [
		location.country,
		location.province,
		location.city,
		location.district,
	].filter(function (part) {
		return typeof part === "string" && part.trim() !== "";
	});
	return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** ISO 时间转本地可读；解析失败则原样返回。 */
export function formatLoreGeneratedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return iso;
	}
	return date.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}
