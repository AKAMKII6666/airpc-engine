/**
	* 故事包管理完整列表：前端搜索 + 分页；列表真源为 data/storis-packages。
	* 挂 shell 灌 packages store；增删改 / 导入 / 首故事经 pageBis。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, CircularProgress, Typography } from "@mui/material";
import { usePackagesShellBis } from "@studio-v2/src/bis/shellBis/packages/packages.shell.bis";
// 引用了ContentPackActions组件，用于内容包导入导出
import { ContentPackActions } from "./com/contentPack/ContentPackActions";
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
	usePackagesShellBis();
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
						管理章节工程：列表来自磁盘扫描；首故事由工作区
						startupPackageId 指定。单包导入导出与内容包（多包运行时）分开。
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了ContentPackActions组件，用于内容包导入导出 */}
					<ContentPackActions onImported={list.onContentPackImported} />
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

			{list.startupError ? (
				// 引用了Alert组件，用于设定首故事失败
				<Alert severity="error">{list.startupError}</Alert>
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
					onSetStartup={function (packageId) {
						void list.onSetStartup(packageId);
					}}
					startupBusy={list.startupBusy}
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
