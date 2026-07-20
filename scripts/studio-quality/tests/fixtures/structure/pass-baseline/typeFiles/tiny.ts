/** 合格小契约：意图注释齐全，规模低于阈值。 */
export type TinyContract = {
	/** 毫秒；由系统生成，UI 只读 */
	delayMs: number;
};

/** 返回固定健康标记；无副作用。 */
export function ping(): "ok" {
	return "ok";
}
