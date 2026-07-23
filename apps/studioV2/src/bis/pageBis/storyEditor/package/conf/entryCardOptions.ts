/**
	* 包配置入口卡 Select 选项：画布 CallCard 优先，否则 conf 索引。
	*/
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

type CardRef = { cardId: string; title?: string };

/**
	* 组装入口卡下拉；画布有卡时用画布标题，保证新建未保存卡也可选。
	*/
export function buildEntryCardSelectOptions(
	callCards: readonly EditorCallCardProjection[],
	packageId: string,
	cardIndex: Readonly<Record<string, readonly CardRef[]>>,
): CallCardLabelOption[] {
	if (callCards.length > 0) {
		return callCards.map(function (card) {
			return {
				label: card.title.trim() !== "" ? card.title : card.cardId,
				value: card.cardId,
			};
		});
	}
	const fromIndex = cardIndex[packageId] ?? [];
	return fromIndex.map(function (card) {
		return {
			label:
				typeof card.title === "string" && card.title.trim() !== ""
					? card.title
					: card.cardId,
			value: card.cardId,
		};
	});
}
