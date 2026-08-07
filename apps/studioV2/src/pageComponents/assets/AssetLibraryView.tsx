/**
	* 资源库独立页：类型筛选 + 列表 + 详情 Formik + 上传 Modal + 删除确认。
	* 挂 shell 灌 assets store；增删改经 pageBis ↔ /api/assets。
	*/
"use client";

import type { FC } from "react";
import { Alert, Typography } from "@mui/material";
import { useAssetsShellBis } from "@studio-v2/src/bis/shellBis/assets/assets.shell.bis";
// 引用了AssetLibraryList组件，用于资源列表
import { AssetLibraryList } from "@studio-v2/src/pageComponents/assets/AssetLibraryList";
// 引用了AssetLibraryDetail组件，用于资源详情
import { AssetLibraryDetail } from "@studio-v2/src/pageComponents/assets/AssetLibraryDetail";
// 引用了AssetLibraryHeader组件，用于页头
import { AssetLibraryHeader } from "@studio-v2/src/pageComponents/assets/com/AssetLibraryHeader";
// 引用了AssetUploadModal组件，用于上传资源文件
import { AssetUploadModal } from "@studio-v2/src/pageComponents/assets/com/AssetUploadModal";
// 引用了AssetLibraryToolbar组件，用于类型筛选
import { AssetLibraryToolbar } from "@studio-v2/src/pageComponents/assets/com/AssetLibraryToolbar";
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
				{page.loading ? (
					<section className={styles.detailPane} aria-label="资源详情">
						{/* 引用了Typography组件，用于加载态 */}
						<Typography variant="body2" color="text.secondary">
							加载资源中…
						</Typography>
					</section>
				) : page.selected ? (
					// 引用了AssetLibraryDetail组件，用于资源详情编辑
					<AssetLibraryDetail
						key={page.selected.assetId}
						asset={page.selected}
						onSaved={page.onDetailSaved}
					/>
				) : (
					<section className={styles.detailPane} aria-label="资源详情">
						{/* 引用了Typography组件，用于空列表提示 */}
						<Typography variant="body2" color="text.secondary">
							暂无资源。可点击「上传资源」写入 data/assets。
						</Typography>
					</section>
				)}
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
