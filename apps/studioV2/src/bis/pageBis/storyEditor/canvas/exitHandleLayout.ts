/**
	* 画布出口 Handle 竖直分布：按 exits[] 下标均分，避免写死 exit_a/exit_b 坐标。
	*/

/**
	* 计算右侧出口 Handle 的 top 百分比。
	* 单出口居中；多出口在 28%–72% 间均分，避免贴顶贴底。
	*/
export function exitHandleTopPercent(index: number, total: number): string {
	if (total <= 0) return "50%";
	if (total === 1) return "50%";
	const start = 28;
	const end = 72;
	const t = index / (total - 1);
	return `${start + (end - start) * t}%`;
}
