/**
 * 玩家可外呼本地小时窗：半开区间判断（与 promptScenes.localHourRange 同口径）。
 * 供 scheduleTick 门闩与单测复用；不读 Profile 以外的 IO。
 */
export type OutboundWindow = {
	/** 起始小时（含），0–23 */
	from: number;
	/** 结束小时（不含），0–24 */
	to: number;
};

/**
 * localHour 是否落在可外呼窗内。
 * 无 window 或非法窗 → true（不闸，兼容旧存档）。
 */
export function isLocalHourInOutboundWindow(
	localHour: number,
	window: OutboundWindow | undefined | null,
): boolean {
	if (!window) return true;
	const { from, to } = window;
	if (
		typeof from !== "number" ||
		typeof to !== "number" ||
		!Number.isInteger(localHour) ||
		localHour < 0 ||
		localHour > 23
	) {
		return true;
	}
	return localHour >= from && localHour < to;
}

/** 从 ISO 时间戳取本地小时 0–23（v1：运行进程本地时区）。 */
export function localHourFromIso(nowIso: string): number {
	const d = new Date(nowIso);
	if (Number.isNaN(d.getTime())) return 0;
	return d.getHours();
}
