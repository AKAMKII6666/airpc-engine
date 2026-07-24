/**
	* CallCard 属性字段主体；从 NodePropertyForm 拆出控行数。
	*/
"use client";

import type { FC } from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于声明式字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import {
	nodeKindBadgeLabel,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import type { NodePropertyFormDerived } from "@studio-v2/src/pageComponents/storyEditor/com/panel/hooks/useNodePropertyFormDerived";
// 引用了CallCardOwnerSelect组件，用于归属角色下拉
import { CallCardOwnerSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/CallCardOwnerSelect";
// 引用了NodePropertySubModules组件，用于子模块折叠区
import { NodePropertySubModules } from "@studio-v2/src/pageComponents/storyEditor/com/panel/NodePropertySubModules";
import styles from "./NodePropertyForm.module.scss";

export type NodePropertyFormFieldsProps = {
	nodeData: EditorCallCardProjection;
	formik: FormikProps<NodePropertyFormValues>;
	characterAnchors: readonly CharacterAnchorNodeData[];
	derived: NodePropertyFormDerived;
	onAssignOwner: (agentId: string, displayName: string) => void;
};

export const NodePropertyFormFields: FC<NodePropertyFormFieldsProps> =
	function ({
		// nodeData 表示当前卡投影，用于只读身份
		nodeData,
		// formik 表示表单实例，用于 AutoForm
		formik,
		// characterAnchors 表示归属选项，用于归属下拉
		characterAnchors,
		// derived 表示派生字段与 items，用于表单编排
		derived,
		// onAssignOwner 用于归属即时写回
		onAssignOwner,
	}) {
		return (
			<div className={styles.body}>
				{derived.formError ? (
					// 引用了Alert组件，用于展示提交级错误
					<Alert severity="error" role="alert">
						{derived.formError}
					</Alert>
				) : null}
				<div className={styles.badgeRow}>
					{/* 引用了Chip组件，用于展示卡片类型徽章 */}
					<Chip
						size="small"
						label={nodeKindBadgeLabel(formik.values.cardKind)}
						color="primary"
						variant="outlined"
					/>
					{/* 引用了Typography组件，用于只读 cardId */}
					<Typography variant="caption" className={styles.agentHint}>
						cardId：{nodeData.cardId}
					</Typography>
				</div>
				{/* 引用了CallCardOwnerSelect组件，用于归属角色下拉 */}
				<CallCardOwnerSelect
					ownerAgentId={nodeData.ownerAgentId ?? ""}
					characterAnchors={characterAnchors}
					onAssignOwner={onAssignOwner}
				/>
				{/* 引用了Typography组件，用于只读出口数 */}
				<Typography variant="caption" className={styles.readonlyBlock}>
					出口数：{derived.exitCount}（由 exits[] 推导）
				</Typography>
				{/* 引用了Typography组件，用于基本信息分段标题 */}
				<Typography variant="caption" className={styles.section}>
					基本信息
				</Typography>
				{/* 引用了AutoForm组件，用于编排类型/标题与入口/交互枚举 */}
				<AutoForm
					formik={formik}
					mode="edit"
					enabled
					items={derived.basicItems}
				/>
				{/* 引用了Typography组件，用于 context 分段标题 */}
				<Typography variant="caption" className={styles.section}>
					情境 · 目标
				</Typography>
				{/* 引用了AutoForm组件，用于编排 context / objectives */}
				<AutoForm
					formik={formik}
					mode="edit"
					enabled
					items={derived.contextItems}
				/>
				{/* 引用了NodePropertySubModules组件，用于子模块折叠区 */}
				<NodePropertySubModules
					formik={formik}
					showSchedule={derived.showSchedule}
					effectPanelSources={derived.effectSources}
				/>
			</div>
		);
	};
