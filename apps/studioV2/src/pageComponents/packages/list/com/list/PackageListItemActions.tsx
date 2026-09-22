/**
	* 故事包列表单行操作按钮组。
	*/
"use client";

import type { FC } from "react";
import { Button } from "@mui/material";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import styles from "../../PackageListView.module.scss";
// 引用了PackageListNavButtons组件，用于进入/调试/导出
import { PackageListNavButtons } from "./nav/PackageListNavButtons";

type Props = {
	pkg: StoryPackageSummary;
	onRequestEdit: (pkg: StoryPackageSummary) => void;
	onRequestDelete: (pkg: StoryPackageSummary) => void;
	canDelete: boolean;
	deleteBlockedReason: string | undefined;
	deleteBusy: boolean;
};

export const PackageListItemActions: FC<Props> = function PackageListItemActions({
	// pkg 本行故事包列表投影
	// pkg 是组件入参，用于渲染与交互
	pkg,
	// onRequestEdit 打开编辑弹层
	// onRequestEdit 是组件入参，用于渲染与交互
	onRequestEdit,
	// onRequestDelete 打开删除确认
	// onRequestDelete 是组件入参，用于渲染与交互
	onRequestDelete,
	// canDelete 是否允许删除
	// canDelete 是组件入参，用于渲染与交互
	canDelete,
	// deleteBlockedReason 禁删 hover 说明
	// deleteBlockedReason 是组件入参，用于渲染与交互
	deleteBlockedReason,
	// deleteBusy 删除提交中
	// deleteBusy 是组件入参，用于渲染与交互
	deleteBusy,
}) {
	return (
		<div className={styles.itemActions}>
			{/* 引用了PackageListNavButtons组件，用于导航按钮 */}
			<PackageListNavButtons packageId={pkg.packageId} />
			{/* 引用了Button组件，用于编辑故事包元数据 */}
			<Button
				size="small"
				variant="outlined"
				onClick={function () {
					onRequestEdit(pkg);
				}}
			>
				编辑
			</Button>
			{/* 引用了Button组件，用于删除故事包 */}
			<Button
				size="small"
				variant="text"
				color="error"
				disabled={!canDelete || deleteBusy}
				title={deleteBlockedReason}
				onClick={function () {
					onRequestDelete(pkg);
				}}
			>
				删除
			</Button>
		</div>
	);
};
