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
	showSchedule: boolean;
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
	const showSchedule = formik.values.cardKind === "schedule";
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
		() => buildNodeContextItems(effectPanelSources.clips),
		[effectPanelSources.clips],
	);
	const basicItems = useMemo(
		() => buildNodeBasicItems(formik.values.cardKind),
		[formik.values.cardKind],
	);
	return {
		formError,
		exitCount,
		showSchedule,
		effectSources,
		basicItems,
		contextItems,
	};
}
