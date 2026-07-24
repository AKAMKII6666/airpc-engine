/**
	* 故事包列表单行：校验徽章、首故事设定、删除与编辑器/调试/导出入口。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import {
	formatRelativeEdit,
	saveStateLabel,
	validationLabel,
} from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "../../PackageListView.module.scss";

type Props = {
	pkg: StoryPackageSummary;
	/** 设定为首故事；进行中由调用方禁用按钮 */
	onSetStartup: (packageId: string) => void;
	/** 当前行设定请求进行中 */
	startupBusy: boolean;
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
	// onSetStartup：点击「设定为首故事」
	const { onSetStartup } = props;
	// startupBusy：本行或其它行正在写首故事时禁用
	const { startupBusy } = props;
	// onRequestDelete：打开删除确认
	const { onRequestDelete } = props;
	// canDelete：首故事 / 最后一包为 false
	const { canDelete } = props;
	// deleteBlockedReason：禁删时 hover 说明
	const { deleteBlockedReason } = props;
	// deleteBusy：删除确认提交中
	const { deleteBusy } = props;

	const rowClass = pkg.isStartup
		? `${styles.item} ${styles.itemStartup}`
		: styles.item;

	return (
		<li className={rowClass}>
			<div className={styles.itemMain}>
				<div className={styles.itemTitleRow}>
					<div className={styles.itemTitle}>{pkg.title}</div>
					{pkg.isStartup ? (
						<span className={styles.startupBadge}>首故事</span>
					) : null}
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
				<div className={styles.itemActions}>
					{/* 引用了Button组件，用于设定工作区首故事 */}
					<Button
						size="small"
						variant={pkg.isStartup ? "contained" : "outlined"}
						color="warning"
						disabled={pkg.isStartup || startupBusy}
						onClick={function () {
							onSetStartup(pkg.packageId);
						}}
					>
						{pkg.isStartup ? "已是首故事" : "设定为首故事"}
					</Button>
					{/* 引用了Button组件，用于进入故事编辑器 */}
					<Button
						component={Link}
						href={`/stories/${pkg.packageId}`}
						size="small"
						variant="contained"
					>
						编辑器
					</Button>
					{/* 引用了Button组件，用于进入调试台 */}
					<Button
						component={Link}
						href="/debugger"
						size="small"
						variant="outlined"
					>
						调试
					</Button>
					{/* 引用了Button组件，用于单包导出页 */}
					<Button
						component={Link}
						href="/packages/export"
						size="small"
						variant="text"
					>
						导出
					</Button>
					{/* 引用了Button组件，用于删除故事包 */}
					<Button
						size="small"
						variant="text"
						color="error"
						disabled={!canDelete || deleteBusy || startupBusy}
						title={deleteBlockedReason}
						onClick={function () {
							onRequestDelete(pkg);
						}}
					>
						删除
					</Button>
				</div>
			</div>
		</li>
	);
};
