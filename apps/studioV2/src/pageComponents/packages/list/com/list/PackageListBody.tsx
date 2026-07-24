/**
	* 故事包列表主体：搜索、行列表、分页。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
// 引用了FrontendPagination组件，用于列表前端分页
import { FrontendPagination } from "@studio-v2/src/commonUiComponents/pagination/FrontendPagination";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
// 引用了PackageListItem组件，用于渲染单条故事包
import { PackageListItem } from "./PackageListItem";
import styles from "../../PackageListView.module.scss";

type Props = {
	search: string;
	onSearchChange: (next: string) => void;
	pageItems: readonly StoryPackageSummary[];
	page: number;
	pageSize: number;
	filteredCount: number;
	onPageChange: (page: number) => void;
	onSetStartup: (packageId: string) => void;
	startupBusy: boolean;
	onRequestDelete: (pkg: StoryPackageSummary) => void;
	canDeletePackage: (pkg: StoryPackageSummary) => boolean;
	deleteBlockedReason: (pkg: StoryPackageSummary) => string | undefined;
	deleteBusy: boolean;
};

export const PackageListBody: FC<Props> = function (props) {
	// search / onSearchChange：标题与 packageId 筛选
	const { search, onSearchChange } = props;
	// pageItems / page / pageSize / filteredCount / onPageChange：分页切片
	const { pageItems, page, pageSize, filteredCount, onPageChange } = props;
	// onSetStartup / startupBusy：首故事设定
	const { onSetStartup, startupBusy } = props;
	// onRequestDelete / canDeletePackage / deleteBlockedReason / deleteBusy：删除
	const {
		onRequestDelete,
		canDeletePackage,
		deleteBlockedReason,
		deleteBusy,
	} = props;

	return (
		<>
			{/* 引用了TextField组件，用于按 title / packageId 筛选 */}
			<TextField
				size="small"
				placeholder="按标题或 packageId 筛选"
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				className={styles.search}
				inputProps={{ "aria-label": "筛选故事包" }}
			/>

			<ul className={styles.list}>
				{pageItems.map((pkg) => (
					// 引用了PackageListItem组件，用于渲染单条故事包
					<PackageListItem
						key={pkg.packageId}
						pkg={pkg}
						onSetStartup={onSetStartup}
						startupBusy={startupBusy}
						onRequestDelete={onRequestDelete}
						canDelete={canDeletePackage(pkg)}
						deleteBlockedReason={deleteBlockedReason(pkg)}
						deleteBusy={deleteBusy}
					/>
				))}
			</ul>

			{/* 引用了FrontendPagination组件，用于列表分页 */}
			<FrontendPagination
				page={page}
				pageSize={pageSize}
				total={filteredCount}
				onChange={onPageChange}
			/>
		</>
	);
};
