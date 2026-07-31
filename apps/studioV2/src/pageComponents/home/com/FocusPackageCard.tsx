/**
	* 首页焦点故事包卡：继续编辑入口与快捷动作。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import {
	formatRelativeEdit,
	saveStateLabel,
	validationLabel,
} from "@studio-v2/typeFiles/story/labels/statusLabels";
import { workbenchBadgeClass } from "@studio-v2/src/pageComponents/home/helper/workbenchBadgeClass";
import styles from "../WorkbenchShell.module.scss";

type Props = {
	pkg: StoryPackageSummary;
};

export const FocusPackageCard: FC<Props> = function (props) {
	// pkg：焦点故事包列表投影
	const { pkg } = props;
	const editorHref =
		pkg.entryChapterId.trim() !== ""
			? `/packages/${pkg.packageId}/chapters/${pkg.entryChapterId}`
			: `/packages/${pkg.packageId}`;
	return (
		<article className={styles.focusCard} aria-label="继续编辑">
			<div className={styles.focusMark} aria-hidden>
				▶
			</div>
			<div className={styles.focusBody}>
				<h2 className={styles.focusTitle}>{pkg.title}</h2>
				<div className={styles.focusMeta}>
					<span>{formatRelativeEdit(pkg.lastEditedAt)}</span>
					<span>{pkg.cardCount} 张卡</span>
					<span>{pkg.characterCount} 个角色</span>
					<span className={workbenchBadgeClass(pkg.validation)}>
						{validationLabel(pkg.validation)}
					</span>
					<span>{saveStateLabel(pkg.saveState)}</span>
				</div>
				{/* 引用了Typography组件，用于包描述 */}
				<Typography variant="body2" color="text.secondary">
					{pkg.description}
				</Typography>
				<div className={styles.focusActions}>
					{/* 引用了Button组件，用于打开入口章编辑器 */}
					<Button
						component={Link}
						href={editorHref}
						variant="contained"
						size="small"
					>
						打开编辑器
					</Button>
					{/* 引用了Button组件，用于跳转调试器 */}
					<Button
						component={Link}
						href="/debugger"
						variant="outlined"
						size="small"
					>
						运行调试
					</Button>
					{/* 引用了Button组件，用于跳转导出页 */}
					<Button
						component={Link}
						href="/packages/export"
						variant="text"
						size="small"
					>
						导出
					</Button>
				</div>
			</div>
		</article>
	);
};
