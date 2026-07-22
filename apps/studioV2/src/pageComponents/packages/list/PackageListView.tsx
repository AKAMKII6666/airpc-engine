/**
	* 故事包管理完整列表：前端分页；列表真源为 data/storis-packages。
	*/
"use client";

import type { FC } from "react";
import { Alert, Button, CircularProgress, TextField, Typography } from "@mui/material";
// 引用了FrontendPagination组件，用于列表前端分页
import { FrontendPagination } from "@studio-v2/src/commonUiComponents/pagination/FrontendPagination";
// 引用了ImportPackageModal组件，用于导入故事包弹层
import { ImportPackageModal } from "@studio-v2/src/pageComponents/packages/import/ImportPackageModal";
// 引用了PackageListItem组件，用于渲染单条故事包
import { PackageListItem } from "./com/PackageListItem";
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
						管理章节工程：列表来自磁盘扫描；打开编辑器读写
						data/storis-packages。
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了Button组件，用于打开导入弹层 */}
					<Button variant="outlined" onClick={() => list.setImportOpen(true)}>
						导入
					</Button>
					{/* 引用了Button组件，用于新建（本步未接落盘） */}
					<Button variant="contained" disabled title="新建落盘后续批次接通">
						新建故事包
					</Button>
				</div>
			</header>

			{list.loadError ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error">{list.loadError}</Alert>
			) : null}

			{list.loading ? (
				<div className={styles.loading}>
					{/* 引用了CircularProgress组件，用于加载指示 */}
					<CircularProgress size={28} />
				</div>
			) : (
				<>
					{/* 引用了TextField组件，用于标题筛选静态占位 */}
					<TextField
						size="small"
						placeholder="按标题筛选（静态占位）"
						disabled
						className={styles.search}
						inputProps={{ "aria-label": "筛选故事包" }}
					/>

					<ul className={styles.list}>
						{list.pageItems.map((pkg) => (
							// 引用了PackageListItem组件，用于渲染单条故事包
							<PackageListItem key={pkg.packageId} pkg={pkg} />
						))}
					</ul>

					{/* 引用了FrontendPagination组件，用于列表分页 */}
					<FrontendPagination
						page={list.page}
						pageSize={PACKAGE_LIST_PAGE_SIZE}
						total={list.packages.length}
						onChange={list.setPage}
					/>
				</>
			)}

			{/* 引用了ImportPackageModal组件，用于导入故事包 */}
			<ImportPackageModal
				open={list.importOpen}
				onClose={() => list.setImportOpen(false)}
				onImported={list.onImported}
			/>
		</main>
	);
};
