/**
 * 资源库详情：分组 Formik 编辑（基本 / 文件 / 引用 / 高级 assetId）。
 * 保存仅会话内 mock；禁止「已保存到磁盘」文案。
 */
"use client";

import type { FC } from "react";
import { Formik, type FormikHelpers } from "formik";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import {
  commitUpdateAssetMock,
  toAssetDetailFormValues,
  validateAssetDetailForm,
  type AssetDetailFormValues,
} from "@studio-v2/src/bis/pageBis/assets/assetDetailForm";
import { AssetDetailEditForm } from "@studio-v2/src/pageComponents/assets/com/AssetDetailEditForm";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "更新失败，请稍后重试";
}

export type AssetLibraryDetailProps = {
  asset: AssetSummary;
  /**
   * 会话内 mock 更新成功后回调，供列表与选中态同步。
   * 不表示已写盘。
   */
  onSaved: (next: AssetSummary) => void;
};

export const AssetLibraryDetail: FC<AssetLibraryDetailProps> = function (
  props,
) {
  const { asset, onSaved } = props;

  async function handleSubmit(
    values: AssetDetailFormValues,
    helpers: FormikHelpers<AssetDetailFormValues>,
  ): Promise<void> {
    helpers.setStatus({ formError: undefined });
    try {
      const next = commitUpdateAssetMock(asset, values);
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
            编辑后应用于会话内列表；刷新页面会丢失未持久化更改。
          </p>
        </div>
      </div>

      <Formik
        initialValues={toAssetDetailFormValues(asset)}
        enableReinitialize
        validate={validateAssetDetailForm}
        onSubmit={handleSubmit}
      >
        {(formik) => <AssetDetailEditForm asset={asset} formik={formik} />}
      </Formik>
    </section>
  );
};
