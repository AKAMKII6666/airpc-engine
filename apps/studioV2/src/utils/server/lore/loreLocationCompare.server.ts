/**
	* 比较 User.location 是否变化（改地提示是否建议重生成 lore）。
	*/

export type LoreLocationLike = {
	country?: string;
	province?: string;
	city?: string;
	district?: string;
} | null | undefined;

function normPart(value: string | undefined): string {
	return typeof value === "string" ? value.trim() : "";
}

function locationKey(loc: LoreLocationLike): string {
	if (!loc) return "";
	return [
		normPart(loc.country),
		normPart(loc.province),
		normPart(loc.city),
		normPart(loc.district),
	].join("\0");
}

/** 两地结构化字段任一不同则 true。 */
export function isUserLocationChanged(
	prev: LoreLocationLike,
	next: LoreLocationLike,
): boolean {
	return locationKey(prev) !== locationKey(next);
}
