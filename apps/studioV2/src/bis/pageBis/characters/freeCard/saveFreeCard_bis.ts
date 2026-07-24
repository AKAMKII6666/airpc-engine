/**
	* Free 卡编辑：拉取 → 表单 → 落盘；缺卡时由创建角色 API 已保证，此处仅读写。
	*/
import {
	applyFreeCardForm,
	toFreeCardFormValues,
	type FreeCardFormValues,
} from "@studio-v2/src/bis/pageBis/characters/freeCard/freeCardForm";
import {
	fetchFreeCard,
	putFreeCard,
} from "@studio-v2/src/utils/ajaxProxy/library/api/freeCardsApi";
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";

/**
	* 打开编辑弹窗前的载荷：磁盘卡 + Formik 初值；会话内短生命周期。
	*/
export type LoadFreeCardEditorResult = {
	/** 磁盘 Free 卡真源；保存时作 previous 合并基线 */
	card: CallCardDefinition;
	/** 弹窗 Formik 初值；由 card 投影，非独立持久化 */
	formValues: FreeCardFormValues;
};

/** GET Free 卡并投影为弹窗初值 */
export async function loadFreeCardEditor(
	freeCardId: string,
): Promise<LoadFreeCardEditorResult> {
	const card = await fetchFreeCard(freeCardId);
	return {
		card,
		formValues: toFreeCardFormValues(card),
	};
}

/** 合并表单并 PUT 落盘；返回最新卡 */
export async function commitSaveFreeCard(
	previous: CallCardDefinition,
	values: FreeCardFormValues,
): Promise<CallCardDefinition> {
	const next = applyFreeCardForm(previous, values);
	return putFreeCard(previous.cardId, next);
}
