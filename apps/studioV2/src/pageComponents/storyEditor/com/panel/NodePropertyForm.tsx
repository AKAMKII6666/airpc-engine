/**
	* 属性浮窗表单体：字段 + 应用到画布 / 首通预览。
	*/
"use client";

import type { FC } from "react";
import { useState } from "react";
import { Button, Typography } from "@mui/material";
import type { FormikProps } from "formik";
// 引用了FirstConnectPromptPreviewModal组件，用于首通提示词预览
import { FirstConnectPromptPreviewModal } from "@studio-v2/src/commonUiComponents/promptPreview/FirstConnectPromptPreviewModal";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import {
	applyNodePropertyForm,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import { callCardProjectionToDef } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/callCardProjectionMapper";
// 引用了NodePropertyFormFields组件，用于属性字段主体
import { NodePropertyFormFields } from "@studio-v2/src/pageComponents/storyEditor/com/panel/NodePropertyFormFields";
import { useNodePropertyFormDerived } from "@studio-v2/src/pageComponents/storyEditor/com/panel/hooks/useNodePropertyFormDerived";
import styles from "./NodePropertyForm.module.scss";

export type NodePropertyFormProps = {
	packageId: string;
	nodeData: EditorCallCardProjection;
	formik: FormikProps<NodePropertyFormValues>;
	characterAnchors: readonly CharacterAnchorNodeData[];
	effectPanelSources: EffectPanelSources;
	onAssignOwner: (agentId: string, displayName: string) => void;
};

export const NodePropertyForm: FC<NodePropertyFormProps> =
	function NodePropertyForm({
		// packageId 表示路由包键，用于首通提示词预览
		packageId,
		// nodeData 表示当前选中卡投影，用于字段与预览
		nodeData,
		// formik 表示浮窗 Formik 实例，用于字段绑定
		formik,
		// characterAnchors 表示归属 Select 选项，用于归属下拉
		characterAnchors,
		// effectPanelSources 表示 Effect 候选源，用于出口列表
		effectPanelSources,
		// onAssignOwner 用于归属即时写回
		onAssignOwner,
	}) {
		const derived = useNodePropertyFormDerived(
			formik,
			nodeData,
			effectPanelSources,
		);
		const [previewOpen, setPreviewOpen] = useState(false);
		const [previewCard, setPreviewCard] = useState<unknown>(null);

		return (
			<>
				<form
					onSubmit={formik.handleSubmit}
					noValidate
					className={styles.form}
				>
					{/* 引用了NodePropertyFormFields组件，用于属性字段主体 */}
					<NodePropertyFormFields
						nodeData={nodeData}
						formik={formik}
						characterAnchors={characterAnchors}
						derived={derived}
						onAssignOwner={onAssignOwner}
					/>
					<div className={styles.actions}>
						{/* 引用了Button组件，用于提交到画布会话态 */}
						<Button
							type="submit"
							variant="contained"
							size="small"
							disabled={formik.isSubmitting}
						>
							应用到画布
						</Button>
						{/* 引用了Button组件，用于打开首通提示词预览 */}
						<Button
							type="button"
							variant="outlined"
							size="small"
							onClick={function () {
								setPreviewCard(
									callCardProjectionToDef(
										applyNodePropertyForm(
											nodeData,
											formik.values,
										),
									),
								);
								setPreviewOpen(true);
							}}
						>
							首通提示词预览
						</Button>
						{/* 引用了Typography组件，用于不写盘提示 */}
						<Typography variant="caption" className={styles.hint}>
							仅更新会话内节点投影，不会写入 data/。
						</Typography>
					</div>
				</form>
				{/* 引用了FirstConnectPromptPreviewModal组件，用于首通提示词预览 */}
				<FirstConnectPromptPreviewModal
					open={previewOpen}
					onClose={function () {
						setPreviewOpen(false);
					}}
					card={previewCard}
					packageId={packageId}
				/>
			</>
		);
	};
