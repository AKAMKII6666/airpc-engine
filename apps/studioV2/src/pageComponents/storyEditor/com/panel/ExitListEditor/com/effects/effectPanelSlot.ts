/**
	* Effect 专属面板统一 slot 契约：分发器把当前行参数与数据源交给具体面板。
	* 各面板内部用 readEffectParams(effect, params) 收窄到自己的变体。
	*/
import type { KnownEffectName } from "@airpc/rpg-engine";
import type {
	EditorEffectParams,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";

export type EffectPanelSlotProps = {
	/** 当前行 effect 名；面板据此从 params 收窄变体 */
	effect: KnownEffectName;
	/** 当前行参数投影；缺省或判别键不符时面板回落默认值 */
	params: EditorEffectParams | undefined;
	/** id 下拉候选源；本轮未接入时为空数组走 helperText */
	sources: EffectPanelSources;
	/** 参数写回；面板改字段后整体回传该行 params */
	onParamsChange: (next: EditorEffectParams) => void;
};
