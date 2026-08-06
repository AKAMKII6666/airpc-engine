/**
	* 故事包列表单行操作按钮组。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import styles from "../../PackageListView.module.scss";

type Props = {
	pkg: StoryPackageSummary;
	onRequestEdit: (pkg: StoryPackageSummary) => void;
	onRequestDelete: (pkg: StoryPackageSummary) => void;
	canDelete: boolean;
	deleteBlockedReason: string | undefined;
	deleteBusy: boolean;
};

export const PackageListItemActions: FC<Props> = function (props) {
	// pkg：本行故事包列表投影
	const { pkg } = props;
	const { onRequestEdit } = props;
	// onRequestDelete：打开删除确认
	const { onRequestDelete } = props;
	// canDelete：是否允许删除
	const { canDelete } = props;
	// deleteBlockedReason：禁删 hover 说明
	const { deleteBlockedReason } = props;
	// deleteBusy：删除提交中
	const { deleteBusy } = props;
	return (
		<div className={styles.itemActions}>
			{/* 引用了Button组件，用于进入章列表 */}
			<Button
				component={Link}
				href={`/packages/${encodeURIComponent(pkg.packageId)}`}
				size="small"
				variant="contained"
			>
				进入故事包
			</Button>
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
			{/* 引用了Button组件，用于进入调试台 */}
			<Button
				component={Link}
				href="/debugger"
				size="small"
				variant="outlined"
			>
				调试
			</Button>
			{/* 引用了Button组件，用于单包导出页 */}
			<Button
				component={Link}
				href="/packages/export"
				size="small"
				variant="text"
			>
				导出
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
