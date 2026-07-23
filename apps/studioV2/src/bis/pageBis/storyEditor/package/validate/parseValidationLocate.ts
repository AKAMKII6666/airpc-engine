/**
	* 从 validatePackage issue.path 解析画布定位目标（card / exit）。
	* 路径形态见引擎：cards/<cardId>.s-card.json#exits.<exitId>…
	*/

export type ValidationLocateTarget = {
	/** 通话卡 cardId；无法解析时为 undefined */
	cardId?: string;
	/** 出口 exitId；仅当 path 含 #exits.<id> 时有值 */
	exitId?: string;
};

const CARD_FILE_RE =
	/(?:^|\/)cards\/([^/#]+)\.s-card\.json(?:#exits\.([^.#/]+))?/;

/**
	* 解析 issue.path → 画布选中目标。
	* 包级 / 角色级 path 无 cardId，调用方仅展示不跳转。
	*/
export function parseValidationLocate(
	issuePath: string,
): ValidationLocateTarget {
	const m = CARD_FILE_RE.exec(issuePath);
	if (!m) return {};
	const cardId = m[1];
	const exitId = m[2];
	return {
		...(cardId ? { cardId } : {}),
		...(exitId ? { exitId } : {}),
	};
}

/** 画布 CallCard 节点 id 约定：card_<cardId>（与 diskBundleGraph 一致） */
export function callCardNodeIdFromCardId(cardId: string): string {
	return `card_${cardId}`;
}
