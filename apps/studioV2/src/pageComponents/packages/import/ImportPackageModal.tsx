/**
	* 导入故事包三步弹层：选文件 → 真预检 → 确认写盘。
	* 主流程入口；整页 /packages/import 仅为薄备选。
	*/
"use client";

import type { FC } from "react";
// 引用了AppModal组件，用于导入三步弹层容器
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import {
	ImportActiveStep,
	ImportStepNav,
} from "./ImportStepPanels";
import { useImportPackageModal } from "./hooks/useImportPackageModal";

export type ImportPackageModalProps = {
	open: boolean;
	onClose: () => void;
	/**
		* 确认导入并写盘成功后回调。
		* 调用方负责刷新列表 / 跳转编辑器。
		*/
	onImported: (packageId: string) => void;
};

export const ImportPackageModal: FC<ImportPackageModalProps> = function ({
	// open 控制弹层显隐；关闭时重置三步流
	open,
	// onClose 由列表页关闭导入弹层
	onClose,
	// onImported 写盘成功后把 packageId 交回列表页做刷新/导航
	onImported,
}) {
	const flow = useImportPackageModal({ onClose, onImported });

	return (
		// 引用了AppModal组件，用于导入三步弹层容器
		<AppModal
			open={open}
			title="导入故事包"
			description="选择 .storypack.json → 预检 → 确认写入 storis-packages。"
			onClose={flow.handleClose}
			maxWidth="md"
		>
			{/* 引用了ImportStepNav组件，用于三步进度指示 */}
			<ImportStepNav step={flow.step} />
			{/* 引用了ImportActiveStep组件，用于当前步骤面板 */}
			<ImportActiveStep
				step={flow.step}
				fileLabel={flow.fileLabel}
				report={flow.report}
				canImport={flow.canImport}
				pickBusy={flow.pickBusy}
				pickError={flow.pickError}
				commitBusy={flow.commitBusy}
				commitError={flow.commitError}
				onPickFile={function (file) {
					void flow.onPickFile(file);
				}}
				onCancel={flow.handleClose}
				onBackToPick={flow.resetFlow}
				onContinuePrecheck={flow.onContinuePrecheck}
				onBackToPrecheck={flow.onBackToPrecheck}
				onConfirmImport={function () {
					void flow.onConfirmImport();
				}}
			/>
		</AppModal>
	);
};
