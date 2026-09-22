/**
	* 节点属性 context 表单项列表（抽出以降函数行数）。
	*/
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/types/autoFormTypes";
import type { FormSelectOption } from "@studio-v2/src/commonUiComponents/form/types/formTypes";
import type { CardKind } from "@studio-v2/typeFiles/story/callCard/engineCallCard";

function buildPlaybackItem(
	clipOptions: readonly FormSelectOption[],
): AutoFormItem {
	const playbackOptions: FormSelectOption[] = [
		{ value: "", label: "（未设）" },
		...clipOptions,
	];
	return {
		name: "context.playbackClipId",
		label: "播放片段",
		comType: "Select",
		options: playbackOptions,
		helperText:
			clipOptions.length === 0
				? "资源库暂无资产；请先在资源浮窗或资源库新建。"
				: "候选来自 /api/assets；空表示未设 playbackClipId。",
	};
}

const VOICEMAIL_CONTEXT_ITEMS: AutoFormItem[] = [
	{
		name: "context.objective",
		label: "本轮目标",
		comType: "AutoTextArea",
		minRows: 2,
		helperText:
			"留言内容按此提示词生成；出口在下方「出口列表」配置。",
	},
];

function buildRealtimeContextItems(
	playbackItem: AutoFormItem,
): AutoFormItem[] {
	return [
		{
			name: "context.objective",
			label: "本轮目标",
			comType: "AutoTextArea",
			minRows: 2,
			helperText: "对应 CallCard context.objective。",
		},
		{
			name: "context.privateBrief",
			label: "私密提要",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.speakableBrief",
			label: "可说提要",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.background",
			label: "背景",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.premise",
			label: "前提",
			comType: "AutoTextArea",
			minRows: 2,
		},
		{
			name: "context.emotion",
			label: "情绪",
			comType: "TextField",
		},
		playbackItem,
		{
			name: "context.forbidden",
			label: "禁说项",
			comType: "StringListEditor",
		},
		{
			name: "objectives.requiredBeats",
			label: "必达节拍",
			comType: "StringListEditor",
		},
	];
}

/**
	* context 标量与列表（不含 promptScenes）。
	* voicemail：只留本轮目标（留言按该提示词生成）；不选手动播放片段。
	*/
export function buildNodeContextItems(
	clipOptions: readonly FormSelectOption[],
	cardKind: CardKind = "story",
): AutoFormItem[] {
	if (cardKind === "voicemail") {
		return VOICEMAIL_CONTEXT_ITEMS;
	}
	return buildRealtimeContextItems(buildPlaybackItem(clipOptions));
}
