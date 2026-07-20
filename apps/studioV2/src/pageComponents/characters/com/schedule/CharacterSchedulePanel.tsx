/**
	* 角色详情 · 定时外呼：标准列表 + FormModal 新增/编辑 + 删除确认。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import libraryStyles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";
import { useCharacterSchedulePanel } from "./hooks/useCharacterSchedulePanel";
// 引用了ScheduleIntentPlayerSelect组件，用于选择玩家
import { ScheduleIntentPlayerSelect } from "./com/list/ScheduleIntentPlayerSelect";
// 引用了ScheduleIntentListSection组件，用于列表加载空态与行
import { ScheduleIntentListSection } from "./com/list/ScheduleIntentListSection";
// 引用了ScheduleIntentModals组件，用于新增编辑与删除弹层
import { ScheduleIntentModals } from "./com/modals/ScheduleIntentModals";
import styles from "./index.module.scss";

export type CharacterSchedulePanelProps = {
	/** 当前角色 agentId；写入 intents 时强制对齐 */
	agentId: string;
};

export const CharacterSchedulePanel: FC<CharacterSchedulePanelProps> =
	function CharacterSchedulePanel({
		// agentId 是当前角色键，用于过滤与写回 intents
		agentId,
	}) {
		const panel = useCharacterSchedulePanel(agentId);
		const { usersState } = panel;

		return (
			<div className={libraryStyles.section}>
				<div className={styles.toolbar}>
					<h3 className={libraryStyles.sectionTitle}>定时外呼列表</h3>
					{usersState.userId ? (
						// 引用了Button组件，用于打开新建定时外呼 Modal
						<Button
							variant="contained"
							size="small"
							onClick={panel.openCreate}
						>
							添加定时外呼
						</Button>
					) : null}
				</div>

				{usersState.usersLoading ? (
					// 引用了Typography组件，用于玩家列表加载态
					<Typography variant="body2" color="text.secondary">
						加载玩家…
					</Typography>
				) : usersState.usersError ? (
					// 引用了Alert组件，用于玩家列表错误
					<Alert severity="error">{usersState.usersError}</Alert>
				) : usersState.users.length === 0 ? (
					// 引用了Typography组件，用于无玩家空态
					<Typography variant="body2" color="text.secondary">
						暂无玩家。请先在玩家配置中新建。
					</Typography>
				) : (
					<>
						{/* 引用了ScheduleIntentPlayerSelect组件，用于选择玩家 */}
						<ScheduleIntentPlayerSelect
							users={usersState.users}
							userId={usersState.userId}
							onUserChange={
								usersState.onUserChange as (
									e: SelectChangeEvent<string>,
								) => void
							}
						/>
						{/* 引用了ScheduleIntentListSection组件，用于列表区 */}
						<ScheduleIntentListSection
							loading={panel.loading}
							error={panel.error}
							intents={panel.intents}
							onEdit={panel.openEdit}
							onDelete={panel.requestDelete}
							onTogglePause={(intent) => {
								void panel.togglePause(intent).catch((err: unknown) => {
									panel.setError(
										err instanceof Error ? err.message : "更新失败",
									);
								});
							}}
						/>
					</>
				)}

				{/* 引用了ScheduleIntentModals组件，用于新增编辑与删除弹层 */}
				<ScheduleIntentModals
					agentId={agentId}
					formOpen={panel.formOpen}
					formMode={panel.formMode}
					formInitial={panel.formInitial}
					onCloseForm={panel.closeForm}
					onSubmitForm={panel.submitForm}
					deleteTarget={panel.deleteTarget}
					onCloseDelete={panel.closeDelete}
					onConfirmDelete={() => {
						void panel.confirmDelete().catch((err: unknown) => {
							panel.setError(
								err instanceof Error ? err.message : "删除失败",
							);
							panel.closeDelete();
						});
					}}
				/>
			</div>
		);
	};
