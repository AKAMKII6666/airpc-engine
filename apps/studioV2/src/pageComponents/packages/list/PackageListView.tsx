/**
	* 故事包管理完整列表：前端分页 + 新建/导入 Modal（主流程）。
	* /packages/create、/packages/import 为薄备选入口；mock 增仅会话内，不写 data/。
	*/
"use client";

import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, Typography } from "@mui/material";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
// 引用了FormModal组件，用于新建故事包弹层
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
// 引用了FrontendPagination组件，用于列表前端分页
import { FrontendPagination } from "@studio-v2/src/commonUiComponents/pagination/FrontendPagination";
import { sliceForPage } from "@studio-v2/src/commonUiComponents/pagination/sliceForPage";
import { commitCreatePackageMock } from "@studio-v2/src/bis/pageBis/packages/createPackage_bis";
import {
	CREATE_PACKAGE_FORM_ITEMS,
	CREATE_PACKAGE_INITIAL_VALUES,
	validateCreatePackageForm,
	type CreatePackageFormValues,
} from "@studio-v2/src/bis/pageBis/packages/createPackageForm";
import { listMockPackages } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
// 引用了ImportPackageModal组件，用于导入故事包弹层
import { ImportPackageModal } from "@studio-v2/src/pageComponents/packages/import/ImportPackageModal";
// 引用了PackageListItem组件，用于渲染单条故事包
import { PackageListItem } from "./com/PackageListItem";
import styles from "./PackageListView.module.scss";

/** 列表页每页条数；mock 量小，用较小 pageSize 便于验收分页 */
const PACKAGE_LIST_PAGE_SIZE = 3;

export const PackageListView: FC = function PackageListView() {
	const router = useRouter();
	const [packages, setPackages] = useState<StoryPackageSummary[]>(() =>
		listMockPackages(),
	);
	const [page, setPage] = useState(1);
	const [createOpen, setCreateOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);

	const refreshPackages = useCallback(() => {
		setPackages(listMockPackages());
	}, []);

	const pageItems = useMemo(
		() => sliceForPage(packages, page, PACKAGE_LIST_PAGE_SIZE),
		[packages, page],
	);

	async function onCreateSubmit(values: CreatePackageFormValues): Promise<void> {
		const { packageId } = commitCreatePackageMock(values);
		refreshPackages();
		setCreateOpen(false);
		router.push(`/stories/${packageId}`);
	}

	function onImported(packageId: string): void {
		refreshPackages();
		setImportOpen(false);
		router.push(`/stories/${packageId}`);
	}

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
						管理章节工程：打开编辑器、调试、导出。内部 ID 不在此手填。
					</Typography>
				</div>
				<div className={styles.actions}>
					{/* 引用了Button组件，用于打开导入弹层 */}
					<Button variant="outlined" onClick={() => setImportOpen(true)}>
						导入
					</Button>
					{/* 引用了Button组件，用于打开新建弹层 */}
					<Button variant="contained" onClick={() => setCreateOpen(true)}>
						新建故事包
					</Button>
				</div>
			</header>

			{/* 引用了TextField组件，用于标题筛选静态占位 */}
			<TextField
				size="small"
				placeholder="按标题筛选（静态占位）"
				disabled
				className={styles.search}
				inputProps={{ "aria-label": "筛选故事包" }}
			/>

			<ul className={styles.list}>
				{pageItems.map((pkg) => (
					// 引用了PackageListItem组件，用于渲染单条故事包
					<PackageListItem key={pkg.packageId} pkg={pkg} />
				))}
			</ul>

			{/* 引用了FrontendPagination组件，用于列表分页 */}
			<FrontendPagination
				page={page}
				pageSize={PACKAGE_LIST_PAGE_SIZE}
				total={packages.length}
				onChange={setPage}
			/>

			{/* 引用了FormModal组件，用于新建故事包 */}
			<FormModal<CreatePackageFormValues>
				open={createOpen}
				title="新建故事包"
				description="填写名称与描述即可。内部 ID 由系统生成；确认后进入编辑器（会话内 mock，不写盘）。"
				onClose={() => setCreateOpen(false)}
				initialValues={CREATE_PACKAGE_INITIAL_VALUES}
				items={CREATE_PACKAGE_FORM_ITEMS}
				validate={validateCreatePackageForm}
				onSubmit={onCreateSubmit}
				submitLabel="创建并进入编辑器"
				mode="add"
			/>

			{/* 引用了ImportPackageModal组件，用于导入故事包 */}
			<ImportPackageModal
				open={importOpen}
				onClose={() => setImportOpen(false)}
				onImported={onImported}
			/>
		</main>
	);
};
