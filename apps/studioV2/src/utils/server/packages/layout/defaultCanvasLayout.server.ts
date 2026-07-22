/**
	* 缺 layout 时的安全默认坐标（引擎忽略；仅 Studio 打开可读）。
	* 不重复写 objective；只按 card 序铺网格。
	*/
import type { StudioCanvasLayout } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

const COLS = 3;
const ORIGIN_X = 200;
const ORIGIN_Y = 120;
const STEP_X = 280;
const STEP_Y = 200;

/**
	* 由 conf 卡序与 participants 生成最小 layout。
	* 调用方：读包发现无 canvas.layout.json 时回落；禁止静默空 nodes。
	*/
export function buildDefaultCanvasLayout(
	packageId: string,
	cardIds: readonly string[],
	participants: readonly string[],
): StudioCanvasLayout {
	return {
		schemaVersion: 1,
		packageId,
		lanes: participants.map(function (agentId, order) {
			return { agentId, order };
		}),
		nodes: cardIds.map(function (cardId, i) {
			const col = i % COLS;
			const row = Math.floor(i / COLS);
			return {
				cardId,
				x: ORIGIN_X + col * STEP_X,
				y: ORIGIN_Y + row * STEP_Y,
			};
		}),
		edges: [],
		note: "缺省 layout：BFF 按 card 序生成安全坐标；引擎忽略本文件",
	};
}
