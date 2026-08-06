/**
	* 故事包列表单行：校验徽章、编辑、删除与包入口。
	*/
"use client";

import type { FC } from "react";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import {
	formatRelativeEdit,
	saveStateLabel,
	validationLabel,
} from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "../../PackageListView.module.scss";
// 引用了PackageListItemActions组件，用于本行操作按钮组
import { PackageListItemActions } from "./PackageListItemActions";

type Props = {
	pkg: StoryPackageSummary;
	/** 打开编辑包信息弹层 */
	onRequestEdit: (pkg: StoryPackageSummary) => void;
	/** 打开删除确认；禁删时由调用方保证不触发或按钮 disabled */
	onRequestDelete: (pkg: StoryPackageSummary) => void;
	/** 是否允许删除本行 */
	canDelete: boolean;
	/** 禁删原因；供 title 提示 */
	deleteBlockedReason: string | undefined;
	/** 删除请求进行中 */
	deleteBusy: boolean;
};

function badgeClass(v: StoryPackageSummary["validation"]): string {
	if (v === "ok") return styles.badgeOk;
	if (v === "warning") return styles.badgeWarn;
	return styles.badgeErr;
}

export const PackageListItem: FC<Props> = function (props) {
	// pkg：本行故事包列表投影
	const { pkg } = props;
	const { onRequestEdit } = props;
	// onRequestDelete：打开删除确认
	const { onRequestDelete } = props;
	// canDelete：最后一包为 false
	const { canDelete } = props;
	// deleteBlockedReason：禁删时 hover 说明
	const { deleteBlockedReason } = props;
	// deleteBusy：删除确认提交中
	const { deleteBusy } = props;

	return (
		<li className={styles.item}>
			<div className={styles.itemMain}>
				<div className={styles.itemTitleRow}>
					<div className={styles.itemTitle}>{pkg.title}</div>
				</div>
				<div className={styles.itemDesc}>{pkg.description}</div>
				<div className={styles.itemStats}>
					{formatRelativeEdit(pkg.lastEditedAt)} · {pkg.characterCount} 角色 ·{" "}
					{pkg.cardCount} 卡 · {pkg.assetCount} 资源 ·{" "}
					{saveStateLabel(pkg.saveState)}
					{pkg.lastExportedAt
						? ` · 曾导出 ${formatRelativeEdit(pkg.lastExportedAt)}`
						: " · 未导出"}
				</div>
			</div>
			<div className={styles.itemSide}>
				<span className={badgeClass(pkg.validation)}>
					{validationLabel(pkg.validation)}
				</span>
				{/* 引用了PackageListItemActions组件，用于本行操作按钮组 */}
				<PackageListItemActions
					pkg={pkg}
					onRequestEdit={onRequestEdit}
					onRequestDelete={onRequestDelete}
					canDelete={canDelete}
					deleteBlockedReason={deleteBlockedReason}
					deleteBusy={deleteBusy}
				/>
			</div>
		</li>
	);
};
