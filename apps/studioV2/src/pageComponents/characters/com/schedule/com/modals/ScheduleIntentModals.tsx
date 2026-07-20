/**
	* 定时外呼 FormModal + 删除确认；从面板拆出以降行数。
	*/
"use client";

import type { FC } from "react";
import type { ScheduledIntent } from "@airpc/rpg-engine";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import {
	describeScheduleIntent,
	validateScheduleIntentForm,
	type ScheduleIntentFormValues,
} from "@studio-v2/src/bis/pageBis/characters/schedule/scheduleIntentForm";
import { renderScheduleIntentFormBody } from "./ScheduleIntentFormBody";

export type ScheduleIntentModalsProps = {
	/** 当前角色 agentId；弹层说明里标注过滤口径 */
	agentId: string;
	formOpen: boolean;
	formMode: "add" | "edit";
	formInitial: ScheduleIntentFormValues;
	onCloseForm: () => void;
	onSubmitForm: (values: ScheduleIntentFormValues) => Promise<void>;
	deleteTarget: ScheduledIntent | null;
	onCloseDelete: () => void;
	onConfirmDelete: () => void;
};

export const ScheduleIntentModals: FC<ScheduleIntentModalsProps> =
	function ScheduleIntentModals({
		// agentId 是当前角色键，用于弹层真源说明
		agentId,
		// formOpen 控制编辑弹层显隐，用于新增/编辑
		formOpen,
		// formMode 区分新建与编辑标题/按钮，用于文案
		formMode,
		// formInitial 是弹层 Formik 初值，用于回填
		formInitial,
		// onCloseForm 关闭编辑弹层，用于取消
		onCloseForm,
		// onSubmitForm 提交写盘，用于保存意图
		onSubmitForm,
		// deleteTarget 是待删意图，用于确认弹层
		deleteTarget,
		// onCloseDelete 关闭删除确认，用于取消删除
		onCloseDelete,
		// onConfirmDelete 确认删除回调，用于执行删除
		onConfirmDelete,
	}) {
		return (
			<>
				{/* 引用了FormModal组件，用于新增/编辑定时外呼 */}
				<FormModal
					open={formOpen}
					title={formMode === "add" ? "添加定时外呼" : "编辑定时外呼"}
					description={`真源为所选玩家的 Profile.schedule；仅本角色（${agentId}）。选择一次性或每日后写入 intents。`}
					onClose={onCloseForm}
					initialValues={formInitial}
					validate={validateScheduleIntentForm}
					onSubmit={onSubmitForm}
					submitLabel={formMode === "add" ? "添加" : "保存"}
					mode={formMode}
					maxWidth="sm"
				>
					{(formik) => renderScheduleIntentFormBody(formik, formMode)}
				</FormModal>

				{/* 引用了DeleteConfirmModal组件，用于删除定时意图确认 */}
				<DeleteConfirmModal
					open={deleteTarget != null}
					title="确认删除定时外呼"
					description="将从该玩家 Profile.schedule.intents 移除本条意图，不可恢复。"
					displayName={
						deleteTarget ? describeScheduleIntent(deleteTarget) : ""
					}
					referenceLines={
						deleteTarget
							? [
									`intentId · ${deleteTarget.intentId}`,
									deleteTarget.topicHint
										? `话题 · ${deleteTarget.topicHint}`
										: "话题 · （无）",
								]
							: []
					}
					error={undefined}
					onClose={onCloseDelete}
					onConfirm={onConfirmDelete}
				/>
			</>
		);
	};
