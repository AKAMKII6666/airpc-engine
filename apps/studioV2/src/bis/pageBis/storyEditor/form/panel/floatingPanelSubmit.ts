/**
	* 属性浮窗 Formik 提交：CallCard / 章节写回会话节点。
	* 从 FloatingPanelShell 拆出以控函数有效行数；不写盘。
	*/
import type { FormikHelpers } from "formik";
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import {
	applyNodePropertyForm,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import {
	applyChapterPropertyForm,
	type ChapterPropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";

function formErrorMessage(error: unknown): string {
	return error instanceof Error && error.message.trim() !== ""
		? error.message
		: "应用失败，请稍后重试";
}

/** CallCard 属性提交：合并表单后回调 applyNodeData */
export async function submitCallCardPropertyForm(args: {
	data: EditorCallCardProjection;
	nodeId: string;
	values: NodePropertyFormValues;
	helpers: FormikHelpers<NodePropertyFormValues>;
	onApplyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
}): Promise<void> {
	const { data, nodeId, values, helpers, onApplyNodeData } = args;
	helpers.setStatus({ formError: undefined });
	try {
		onApplyNodeData(nodeId, applyNodePropertyForm(data, values));
	} catch (error) {
		helpers.setStatus({ formError: formErrorMessage(error) });
	} finally {
		helpers.setSubmitting(false);
	}
}

/** 章节属性提交：合并表单后回调 applyChapterNodeData */
export async function submitChapterPropertyForm(args: {
	data: EditorChapterNodeData;
	nodeId: string;
	values: ChapterPropertyFormValues;
	helpers: FormikHelpers<ChapterPropertyFormValues>;
	onApplyChapterNodeData: (
		nodeId: string,
		next: EditorChapterNodeData,
	) => void;
}): Promise<void> {
	const { data, nodeId, values, helpers, onApplyChapterNodeData } = args;
	helpers.setStatus({ formError: undefined });
	try {
		onApplyChapterNodeData(nodeId, applyChapterPropertyForm(data, values));
	} catch (error) {
		helpers.setStatus({ formError: formErrorMessage(error) });
	} finally {
		helpers.setSubmitting(false);
	}
}
