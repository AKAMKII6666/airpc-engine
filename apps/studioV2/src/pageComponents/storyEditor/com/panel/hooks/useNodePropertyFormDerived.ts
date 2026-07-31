/**
	* 属性浮窗派生：AutoForm items、Effect 候选过滤、voicemail 锁定。
	* 从 NodePropertyForm 拆出，压低组件有效行数。
	*/
import { useMemo } from "react";
import type { FormikProps } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import {
	buildNodeBasicItems,
	buildNodeContextItems,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import { exitCountFromProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { useVoicemailModeLock } from "@studio-v2/src/pageComponents/storyEditor/com/panel/hooks/useVoicemailModeLock";

export type NodePropertyFormDerived = {
	formError: string | undefined;
	exitCount: number;
	/** 遗留包内 schedule 卡才展示调度折叠区 */
	showSchedule: boolean;
	/** 非 voicemail 才展示场景提示词 / 工具策略 */
	showStoryExtras: boolean;
	effectSources: EffectPanelSources;
	basicItems: AutoFormItem[];
	contextItems: AutoFormItem[];
};

function readFormError(
	status: FormikProps<NodePropertyFormValues>["status"],
): string | undefined {
	if (
		typeof status === "object" &&
		status !== null &&
		"formError" in status &&
		typeof (status as { formError?: unknown }).formError === "string"
	) {
		return (status as { formError: string }).formError;
	}
	return undefined;
}

/** 汇总表单派生态；副作用：voicemail 字段锁定 */
export function useNodePropertyFormDerived(
	formik: FormikProps<NodePropertyFormValues>,
	nodeData: EditorCallCardProjection,
	effectPanelSources: EffectPanelSources,
): NodePropertyFormDerived {
	useVoicemailModeLock(formik);
	const formError = readFormError(formik.status);
	const exitCount = exitCountFromProjection(nodeData);
	const cardKind = formik.values.cardKind;
	const showSchedule = cardKind === "schedule";
	const showStoryExtras = cardKind !== "voicemail";
	// Effect 目标卡下拉排除本卡：attach/unmount/调度目标应指向其它卡
	const effectSources = useMemo(
		() => ({
			...effectPanelSources,
			cards: effectPanelSources.cards.filter(
				(card) => card.value !== nodeData.cardId,
			),
		}),
		[effectPanelSources, nodeData.cardId],
	);
	const contextItems = useMemo(
		() => buildNodeContextItems(effectPanelSources.clips, cardKind),
		[effectPanelSources.clips, cardKind],
	);
	const basicItems = useMemo(
		() => buildNodeBasicItems(cardKind, formik.values.interactionMode),
		[cardKind, formik.values.interactionMode],
	);
	return {
		formError,
		exitCount,
		showSchedule,
		showStoryExtras,
		effectSources,
		basicItems,
		contextItems,
	};
}
