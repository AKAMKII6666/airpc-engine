/**
	* 属性浮窗折叠子模块：promptScenes / exits / toolPolicy / schedule。
	* 从 NodePropertyForm 拆出，压低父组件有效行数。
	*/
"use client";

import type { FC } from "react";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于子模块字段编排
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import {
	buildNodeToolPolicyItems,
	NODE_PROMPT_SCENE_ITEMS,
	NODE_SCHEDULE_ITEMS,
	type NodePropertyFormValues,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
// 引用了ExitListEditor组件，用于 exits[] 增删与概要
import { ExitListEditor } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/ExitListEditor";
import styles from "./NodePropertyForm.module.scss";

export type NodePropertySubModulesProps = {
	formik: FormikProps<NodePropertyFormValues>;
	/** 仅 schedule 卡展示调度折叠区 */
	showSchedule: boolean;
};

export const NodePropertySubModules: FC<NodePropertySubModulesProps> =
	function NodePropertySubModules({
		// formik 是属性浮窗 Formik，用于子模块自动绑
		formik,
		// showSchedule 表示是否展示 ScheduleMeta 折叠区
		showSchedule,
	}) {
		// 属性浮窗 enableReinitialize 切换选中瞬间 toolPolicy 可能尚未就绪，兜底空模式
		const toolPolicyItems = buildNodeToolPolicyItems(
			formik.values.toolPolicy?.mode ?? "",
		);

		return (
			<>
				<details className={styles.fold} open>
					<summary>场景提示词</summary>
					{/* 引用了AutoForm组件，用于 PromptSceneListEditor */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={NODE_PROMPT_SCENE_ITEMS}
					/>
				</details>

				<details className={styles.fold} open>
					<summary>出口列表</summary>
					{/* 引用了ExitListEditor组件，用于 exits[] 增删与概要 */}
					<ExitListEditor formik={formik} />
				</details>

				<details className={styles.fold}>
					<summary>工具策略</summary>
					{/* 引用了AutoForm组件，用于 toolPolicy 模式与内置工具多选 */}
					<AutoForm
						formik={formik}
						mode="edit"
						enabled
						items={toolPolicyItems}
					/>
				</details>

				{showSchedule ? (
					<details className={styles.fold} open>
						<summary>调度条件</summary>
						{/* 引用了AutoForm组件，用于 ScheduleMeta 字段 */}
						<AutoForm
							formik={formik}
							mode="edit"
							enabled
							items={NODE_SCHEDULE_ITEMS}
						/>
					</details>
				) : null}
			</>
		);
	};
