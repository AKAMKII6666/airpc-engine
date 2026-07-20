/**
	* 属性浮窗表单体：只读身份 + AutoForm 真字段 + 子模块折叠区。
	* 校验态 / exitCount 不进 Formik；包配置不在单卡属性内（见 PackageConfigFloat）。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, Chip, Typography } from "@mui/material";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于声明式字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
import {
	NODE_BASIC_ITEMS,
	NODE_CONTEXT_ITEMS,
	nodeKindBadgeLabel,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import { exitCountFromProjection } from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
// 引用了NodePropertySubModules组件，用于 promptScenes/exits/toolPolicy/schedule
import { NodePropertySubModules } from "@studio-v2/src/pageComponents/storyEditor/com/panel/NodePropertySubModules";
import styles from "./NodePropertyForm.module.scss";

export type NodePropertyFormProps = {
	nodeData: EditorCallCardProjection;
	formik: FormikProps<NodePropertyFormValues>;
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

export const NodePropertyForm: FC<NodePropertyFormProps> =
	function NodePropertyForm({
		// nodeData 是当前选中卡投影，用于只读身份与类型徽章
		nodeData,
		// formik 是浮窗持有的 Formik 实例，用于 AutoForm 字段自动绑
		formik,
	}) {
		const formError = readFormError(formik.status);
		const exitCount = exitCountFromProjection(nodeData);

		return (
			<form onSubmit={formik.handleSubmit} noValidate className={styles.form}>
				{formError ? (
					// 引用了Alert组件，用于展示提交级错误
					<Alert severity="error" role="alert">
						{formError}
					</Alert>
				) : null}

				<div className={styles.badgeRow}>
					{/* 引用了Chip组件，用于展示卡片类型徽章 */}
					<Chip
						size="small"
						label={nodeKindBadgeLabel(nodeData.cardKind)}
						color="primary"
						variant="outlined"
					/>
					{/* 引用了Typography组件，用于只读 cardId */}
					<Typography variant="caption" className={styles.agentHint}>
						cardId：{nodeData.cardId}
					</Typography>
				</div>

				{/* 引用了Typography组件，用于只读归属信息 */}
				<Typography variant="caption" className={styles.readonlyBlock}>
					所属角色：{nodeData.ownerDisplayName || "—"}
					{" · "}
					ownerAgentId：{nodeData.ownerAgentId || "未绑定"}
					{" · "}
					出口数：{exitCount}（由 exits[] 推导）
				</Typography>

				{/* 引用了Typography组件，用于基本信息分段标题 */}
				<Typography variant="caption" className={styles.section}>
					基本信息
				</Typography>
				{/* 引用了AutoForm组件，用于编排标题与入口/交互枚举 */}
				<AutoForm
					formik={formik}
					mode="edit"
					enabled
					items={NODE_BASIC_ITEMS}
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
					items={NODE_CONTEXT_ITEMS}
				/>

				{/* 引用了NodePropertySubModules组件，用于子模块折叠区 */}
				<NodePropertySubModules
					formik={formik}
					showSchedule={nodeData.cardKind === "schedule"}
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
					{/* 引用了Typography组件，用于不写盘提示 */}
					<Typography variant="caption" className={styles.hint}>
						仅更新会话内节点投影，不会写入 data/。
					</Typography>
				</div>
			</form>
		);
	};
