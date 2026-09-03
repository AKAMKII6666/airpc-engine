/**
	* 聊天列表虚拟窗口与贴底判定。
	*/
export const ESTIMATED_ITEM_HEIGHT = 112;
export const OVERSCAN = 5;
export const VIRTUAL_THRESHOLD = 50;

export function isNearBottom(el: HTMLDivElement): boolean {
	return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
}

export function calcVisibleRange(input: {
	scrollTop: number;
	clientHeight: number;
	total: number;
}): { start: number; end: number } {
	const start = Math.max(
		0,
		Math.floor(input.scrollTop / ESTIMATED_ITEM_HEIGHT) - OVERSCAN,
	);
	const end = Math.min(
		input.total,
		Math.ceil((input.scrollTop + input.clientHeight) / ESTIMATED_ITEM_HEIGHT) +
			OVERSCAN,
	);
	return { start, end };
}
