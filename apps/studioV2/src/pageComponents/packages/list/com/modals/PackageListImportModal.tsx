/**
	* 故事包列表：导入弹层。
	*/
"use client";

import type { FC } from "react";
// 引用了ImportPackageModal组件，用于导入故事包弹层
import { ImportPackageModal } from "@studio-v2/src/pageComponents/packages/import/ImportPackageModal";

export type PackageListImportModalProps = {
	open: boolean;
	onClose: () => void;
	onImported: (packageId: string) => void;
};

export const PackageListImportModal: FC<PackageListImportModalProps> =
	function PackageListImportModal({
		// open 表示导入弹层是否打开
		open,
		// onClose 关闭导入弹层，用于组件入参
		onClose,
		// onImported 导入成功后回调 packageId，用于组件入参
		onImported,
	}) {
		return (
			// 引用了ImportPackageModal组件，用于导入故事包
			<ImportPackageModal
				open={open}
				onClose={onClose}
				onImported={onImported}
			/>
		);
	};
