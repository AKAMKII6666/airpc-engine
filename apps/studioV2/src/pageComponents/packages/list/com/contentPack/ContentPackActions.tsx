/**
	* 内容包导入/导出动作区：列表页顶栏；覆盖导入有确认。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button } from "@mui/material";
// 引用了AppModal组件，用于覆盖导入确认
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import { useContentPackActions } from "../../hooks/useContentPackActions";
import styles from "../../PackageListView.module.scss";

type Props = {
	/** 覆盖导入成功后：刷新列表（不跳转单包编辑器） */
	onImported: (startupPackageId: string) => void;
};

export const ContentPackActions: FC<Props> = function (props) {
	// onImported：导入成功后交回列表页 bump
	const { onImported } = props;
	const flow = useContentPackActions({ onImported });

	return (
		<div className={styles.contentPackBlock}>
			<div className={styles.contentPackButtons}>
				{/* 引用了Button组件，用于导出内容包 */}
				<Button
					variant="outlined"
					color="secondary"
					disabled={flow.exportBusy || flow.importBusy}
					onClick={flow.onExport}
				>
					{flow.exportBusy ? "导出中…" : "导出内容包"}
				</Button>
				{/* 引用了Button组件，用于选择内容包文件 */}
				<Button
					variant="outlined"
					color="secondary"
					disabled={flow.exportBusy || flow.importBusy}
					onClick={flow.onPickClick}
				>
					导入内容包
				</Button>
			</div>
			<input
				ref={flow.fileRef}
				type="file"
				accept=".json,application/json"
				hidden
				onChange={flow.onFileChange}
			/>
			{flow.error ? (
				// 引用了Alert组件，用于内容包错误
				<Alert severity="error">{flow.error}</Alert>
			) : null}
			{flow.doneMsg ? (
				// 引用了Alert组件，用于内容包成功提示
				<Alert severity="success">{flow.doneMsg}</Alert>
			) : null}
			{/* 引用了AppModal组件，用于覆盖导入确认 */}
			<AppModal
				open={flow.confirmOpen}
				title="覆盖导入内容包"
				description={
					flow.pendingLabel
						? `将用「${flow.pendingLabel}」覆盖当前工作区全部故事包与首故事指针。用户存档不在此范围。`
						: "将覆盖当前工作区全部故事包与首故事指针。"
				}
				onClose={flow.onCancelConfirm}
				maxWidth="sm"
			>
				<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
					{/* 引用了Button组件，用于取消覆盖导入 */}
					<Button disabled={flow.importBusy} onClick={flow.onCancelConfirm}>
						取消
					</Button>
					{/* 引用了Button组件，用于确认覆盖导入 */}
					<Button
						variant="contained"
						color="warning"
						disabled={flow.importBusy}
						onClick={flow.onConfirmImport}
					>
						{flow.importBusy ? "导入中…" : "确认覆盖导入"}
					</Button>
				</div>
			</AppModal>
		</div>
	);
};
