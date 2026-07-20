/**
	* 资源库独立页：类型筛选 + 列表 + 详情 Formik + 新建 FormModal + 删除确认。
	* assetId 系统生成；mock 仅会话内，不接真上传 / 写盘。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import { FormModal } from "@studio-v2/src/commonUiComponents/modal/form/FormModal";
import {
	CREATE_ASSET_FORM_ITEMS,
	CREATE_ASSET_INITIAL_VALUES,
	validateCreateAssetForm,
	type CreateAssetFormValues,
} from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import { AssetLibraryList } from "@studio-v2/src/pageComponents/assets/AssetLibraryList";
import { AssetLibraryDetail } from "@studio-v2/src/pageComponents/assets/AssetLibraryDetail";
import { AssetLibraryHeader } from "@studio-v2/src/pageComponents/assets/com/AssetLibraryHeader";
import { AssetLibraryToolbar } from "@studio-v2/src/pageComponents/assets/com/AssetLibraryToolbar";
import { DeleteConfirmModal } from "@studio-v2/src/commonUiComponents/modal/confirm/DeleteConfirmModal";
import { useAssetLibraryPage } from "@studio-v2/src/pageComponents/assets/hooks/useAssetLibraryPage";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export const AssetLibraryView: FC = function () {
	const page = useAssetLibraryPage();

	return (
		<main className={styles.root}>
			{/* 引用了AssetLibraryHeader组件，用于页头与新建入口 */}
			<AssetLibraryHeader onCreate={() => page.setCreateOpen(true)} />
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
				{page.selected ? (
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
							暂无资源。可点击「上传 / 新建资源」创建会话内条目。
						</Typography>
					</section>
				)}
			</div>

			{/* 引用了FormModal组件，用于新建资源 AutoForm */}
			<FormModal<CreateAssetFormValues>
				open={page.createOpen}
				title="新建资源"
				description="登记资源元数据即可。assetId 由系统生成；本步不真上传文件，仅写入会话内列表（不写盘）。"
				onClose={() => page.setCreateOpen(false)}
				initialValues={CREATE_ASSET_INITIAL_VALUES}
				items={CREATE_ASSET_FORM_ITEMS}
				validate={validateCreateAssetForm}
				onSubmit={page.onCreateSubmit}
				submitLabel="创建资源"
				mode="add"
			/>

			{/* 引用了DeleteConfirmModal组件，用于删除确认 */}
			<DeleteConfirmModal
				open={page.deleteTarget != null}
				title="确认删除资源"
				description="仅从当前会话列表移除，不会写盘。若仍有引用，删除后相关校验可能报错。"
				displayName={page.deleteTarget?.displayName ?? ""}
				referenceLines={page.deleteTarget?.referenceLines ?? []}
				error={page.deleteError}
				onClose={page.closeDeleteModal}
				onConfirm={page.onConfirmDelete}
			/>
		</main>
	);
};
