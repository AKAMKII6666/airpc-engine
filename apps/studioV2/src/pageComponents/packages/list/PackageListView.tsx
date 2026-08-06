/**
	* 故事包管理完整列表：前端搜索 + 分页；列表真源为 data/storis-packages。
	* 挂 shell 灌 packages store；增删改 / 导入经 pageBis。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, CircularProgress, Typography } from "@mui/material";
// 引用了PackageListBody组件，用于搜索与分页列表
import { PackageListBody } from "./com/list/PackageListBody";
// 引用了PackageListModals组件，用于导入/新建/删除弹层
import { PackageListModals } from "./com/modals/PackageListModals";
import {
	PACKAGE_LIST_PAGE_SIZE,
	usePackageListPage,
} from "./hooks/usePackageListPage";
import styles from "./PackageListView.module.scss";

export const PackageListView: FC = function PackageListView() {
	const list = usePackageListPage();

	return (
		<main className={styles.root}>
			<header className={styles.header}>
				<div>
					{/* 引用了Typography组件，用于页标题 */}
					<Typography variant="h5" component="h1" className={styles.title}>
						故事包
					</Typography>
					{/* 引用了Typography组件，用于页说明 */}
					<Typography variant="body2" className={styles.sub}>
						管理章节工程：列表来自磁盘扫描。每个故事包的首入口在包内章节列表中设定。
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了Button组件，用于打开导入弹层 */}
					<Button variant="outlined" onClick={() => list.setImportOpen(true)}>
						导入故事包
					</Button>
					{/* 引用了Button组件，用于打开新建 FormModal */}
					<Button variant="contained" onClick={() => list.setCreateOpen(true)}>
						新建故事包
					</Button>
				</div>
			</header>

			{list.loadError ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error">{list.loadError}</Alert>
			) : null}

			{list.deleteError && !list.deleteTarget ? (
				// 引用了Alert组件，用于禁删提示（未开确认弹层时）
				<Alert severity="warning">{list.deleteError}</Alert>
			) : null}

			{list.loading ? (
				<div className={styles.loading}>
					{/* 引用了CircularProgress组件，用于加载指示 */}
					<CircularProgress size={28} />
				</div>
			) : (
				// 引用了PackageListBody组件，用于搜索与分页列表
				<PackageListBody
					search={list.search}
					onSearchChange={list.onSearchChange}
					pageItems={list.pageItems}
					page={list.page}
					pageSize={PACKAGE_LIST_PAGE_SIZE}
					filteredCount={list.filteredCount}
					onPageChange={list.setPage}
					onRequestEdit={list.setEditTarget}
					onRequestDelete={list.openDeleteModal}
					canDeletePackage={list.canDeletePackage}
					deleteBlockedReason={list.deleteBlockedReason}
					deleteBusy={list.deleteBusy}
				/>
			)}

			{/* 引用了PackageListModals组件，用于导入/新建/删除弹层 */}
			<PackageListModals
				importOpen={list.importOpen}
				onCloseImport={() => list.setImportOpen(false)}
				onImported={list.onImported}
				createOpen={list.createOpen}
				onCloseCreate={() => list.setCreateOpen(false)}
				onCreateSubmit={list.onCreateSubmit}
				editOpen={list.editTarget != null}
				editInitialTitle={list.editTarget?.title ?? ""}
				onCloseEdit={() => list.setEditTarget(null)}
				onEditSubmit={list.onEditSubmit}
				deleteOpen={list.deleteTarget != null}
				deleteDisplayName={list.deleteTarget?.title ?? ""}
				deleteReferenceLines={list.deleteTarget?.referenceLines ?? []}
				deleteError={list.deleteError}
				onCloseDelete={list.closeDeleteModal}
				onConfirmDelete={function () {
					void list.onConfirmDelete();
				}}
			/>
		</main>
	);
};
