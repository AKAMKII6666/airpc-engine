/**
	* 包内章列表行：单章操作按钮。
	*/
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import styles from "../ChapterListView.module.scss";

type Props = {
	packageId: string;
	chapter: DiskChapterSummary;
	isEntry: boolean;
	busy: boolean;
	onSetEntry: (chapterId: string) => void;
	onDelete: (chapterId: string) => void;
};

export const ChapterListRow: FC<Props> = function (props) {
	const { packageId, chapter, isEntry, busy, onSetEntry, onDelete } = props;
	const rowClass = isEntry
		? `${styles.item} ${styles.itemEntry}`
		: styles.item;
	const entryCardText =
		chapter.entryCardId.trim() !== "" ? chapter.entryCardId : "未指定";

	return (
		<li className={rowClass}>
			<div className={styles.itemMain}>
				<div className={styles.itemTitleRow}>
					<div className={styles.itemTitle}>{chapter.title}</div>
					{isEntry ? <span className={styles.entryBadge}>入口章</span> : null}
				</div>
				<div className={styles.itemMeta}>
					{chapter.chapterId} · 入口卡 {entryCardText}
				</div>
				<div className={styles.itemStats}>
					{chapter.cardCount} 卡 · {chapter.characterCount} 角色 ·{" "}
					{chapter.assetCount} 资源
				</div>
			</div>
			<div className={styles.itemSide}>
				<div className={styles.itemActions}>
					{/* 引用了Button组件，用于进入章编辑器 */}
					<Button
						component={Link}
						href={`/packages/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(chapter.chapterId)}`}
						size="small"
						variant="contained"
					>
						进入编辑器
					</Button>
					{!isEntry ? (
						// 引用了Button组件，用于设为入口章
						<Button
							size="small"
							variant="outlined"
							disabled={busy}
							onClick={function () {
								void onSetEntry(chapter.chapterId);
							}}
						>
							设为入口
						</Button>
					) : null}
					{/* 引用了Button组件，用于删除章 */}
					<Button
						size="small"
						variant="text"
						color="error"
						disabled={busy || isEntry}
						onClick={function () {
							void onDelete(chapter.chapterId);
						}}
					>
						删除
					</Button>
				</div>
			</div>
		</li>
	);
};
