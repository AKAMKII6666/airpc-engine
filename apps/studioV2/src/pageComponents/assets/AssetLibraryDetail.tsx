/**
	* 资源库详情：分组 Formik 编辑（基本 / 文件 / 引用 / 高级 assetId）。
	* 保存经 /api/assets 写 data/assets/meta。
	*/
"use client";

import type { FC } from "react";
import { Formik, type FormikHelpers } from "formik";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import {
	toAssetDetailFormValues,
	validateAssetDetailForm,
	type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import { commitSaveAssetDetail } from "@studio-v2/src/bis/pageBis/assets/save/saveAsset_bis";
// 引用了AssetDetailEditForm组件，用于详情分段表单
import { AssetDetailEditForm } from "@studio-v2/src/pageComponents/assets/com/AssetDetailEditForm";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "保存失败，请稍后重试";
}

export type AssetLibraryDetailProps = {
	asset: AssetSummary;
	/**
		* 落盘并回读成功后回调，供列表与选中态同步。
		*/
	onSaved: (next: AssetSummary) => void;
};

export const AssetLibraryDetail: FC<AssetLibraryDetailProps> =
	function AssetLibraryDetail({
		// asset 是当前选中资源投影，用于初值与只读区
		asset,
		// onSaved 在落盘成功后回调，用于同步列表
		onSaved,
	}) {
		async function handleSubmit(
			values: AssetDetailFormValues,
			helpers: FormikHelpers<AssetDetailFormValues>,
		): Promise<void> {
			helpers.setStatus({ formError: undefined });
			try {
				const next = await commitSaveAssetDetail(asset, values);
				onSaved(next);
			} catch (error) {
				helpers.setStatus({ formError: toErrorMessage(error) });
			} finally {
				helpers.setSubmitting(false);
			}
		}

		return (
			<section className={styles.detailPane} aria-label="资源详情">
				<div className={styles.detailHead}>
					<div>
						<h2 className={styles.detailTitle}>{asset.displayName}</h2>
						<p className={styles.detailMeta}>
							编辑后保存到 data/assets；刷新后字段仍在。
						</p>
					</div>
				</div>

				{/* 引用了Formik组件，用于详情编辑态表单状态 */}
				<Formik
					initialValues={toAssetDetailFormValues(asset)}
					enableReinitialize
					validate={validateAssetDetailForm}
					onSubmit={handleSubmit}
				>
					{(formik) => (
						// 引用了AssetDetailEditForm组件，用于基本/文件信息编辑
						<AssetDetailEditForm asset={asset} formik={formik} />
					)}
				</Formik>
			</section>
		);
	};
