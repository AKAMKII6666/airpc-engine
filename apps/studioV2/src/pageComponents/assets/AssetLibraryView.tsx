/**
	* 资源库独立页：类型筛选 + 列表 + 详情 Formik + 上传 Modal + 删除确认。
	*/
"use client";

import type { FC } from "react";
import { Alert } from "@mui/material";
import { useAssetsShellBis } from "@studio-v2/src/bis/shellBis/assets/assets.shell.bis";
// 引用了AssetLibraryList组件，用于资源列表
import { AssetLibraryList } from "@studio-v2/src/pageComponents/assets/AssetLibraryList";
// 引用了AssetLibraryHeader组件，用于页头
import { AssetLibraryHeader } from "@studio-v2/src/pageComponents/assets/com/library/AssetLibraryHeader";
// 引用了AssetLibraryDetailPane组件，用于详情区
import { AssetLibraryDetailPane } from "@studio-v2/src/pageComponents/assets/com/library/AssetLibraryDetailPane";
// 引用了AssetUploadModal组件，用于上传资源文件
import { AssetUploadModal } from "@studio-v2/src/pageComponents/assets/com/upload/AssetUploadModal";
// 引用了AssetLibraryToolbar组件，用于类型筛选
import { AssetLibraryToolbar } from "@studio-v2/src/pageComponents/assets/com/library/AssetLibraryToolbar";
// 引用了DeleteConfirmModal组件，用于删除确认
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import { useAssetLibraryPage } from "@studio-v2/src/pageComponents/assets/hooks/useAssetLibraryPage";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export const AssetLibraryView: FC = function () {
	useAssetsShellBis();
	const page = useAssetLibraryPage();

	return (
		<main className={styles.root}>
			{/* 引用了AssetLibraryHeader组件，用于页头与上传入口 */}
			<AssetLibraryHeader onUpload={() => page.setUploadOpen(true)} />
			{page.loadError ? (
				// 引用了Alert组件，用于列表加载失败
				<Alert severity="error" role="alert">
					{page.loadError}
				</Alert>
			) : null}
			{/* 引用了AssetLibraryToolbar组件，用于资源类型筛选 */}
			<AssetLibraryToolbar kind={page.kind} onKindChange={page.setKind} />

			<div className={styles.split}>
				{/* 引用了AssetLibraryList组件，用于资源列表 */}
				<AssetLibraryList
					items={page.filtered}
					selectedId={page.selected?.assetId}
					onSelect={page.setSelectedId}
					onRequestDelete={page.onRequestDelete}
				/>
				{/* 引用了AssetLibraryDetailPane组件，用于详情区 */}
				<AssetLibraryDetailPane
					loading={page.loading}
					selected={page.selected}
					onSaved={page.onDetailSaved}
				/>
			</div>

			{/* 引用了AssetUploadModal组件，用于上传真实文件 */}
			<AssetUploadModal
				open={page.uploadOpen}
				onClose={() => page.setUploadOpen(false)}
				onUpload={page.onUploadFile}
			/>

			{/* 引用了DeleteConfirmModal组件，用于删除确认 */}
			<DeleteConfirmModal
				open={page.deleteTarget != null}
				title="确认删除资源"
				description="将从 data/assets 删除元数据（及可解析的文件）。若仍有引用，保存校验可能报 ASSET_UNKNOWN。"
				displayName={page.deleteTarget?.displayName ?? ""}
				referenceLines={page.deleteTarget?.referenceLines ?? []}
				error={page.deleteError}
				onClose={page.closeDeleteModal}
				onConfirm={() => {
					void page.onConfirmDelete();
				}}
			/>
		</main>
	);
};
