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

export const ChapterListRow: FC<Props> = function ChapterListRow({
	// packageId 是故事包 id，用于编辑器链接
	packageId,
	// chapter 是章摘要，用于展示标题与统计
	chapter,
	// isEntry 表示是否入口章，用于徽章与禁用删除
	isEntry,
	// busy 表示写操作进行中，用于禁用按钮
	busy,
	// onSetEntry 设为入口章回调，用于组件入参
	onSetEntry,
	// onDelete 删除章回调，用于组件入参
	onDelete,
}) {
	const rowClass = isEntry ? `${styles.item} ${styles.itemEntry}` : styles.item;
	const entryCardText =
		chapter.entryCardId.trim() !== "" ? chapter.entryCardId : "未指定";
	const editorHref = `/packages/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(chapter.chapterId)}`;

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
				{/* 引用了ChapterListRowActions组件，用于行内按钮 */}
				<ChapterListRowActions
					editorHref={editorHref}
					isEntry={isEntry}
					busy={busy}
					chapterId={chapter.chapterId}
					onSetEntry={onSetEntry}
					onDelete={onDelete}
				/>
			</div>
		</li>
	);
};

type ActionsProps = {
	editorHref: string;
	isEntry: boolean;
	busy: boolean;
	chapterId: string;
	onSetEntry: (chapterId: string) => void;
	onDelete: (chapterId: string) => void;
};

function ChapterListRowActions({
	// editorHref 是进入编辑器的链接，用于组件入参
	editorHref,
	// isEntry 表示入口章，用于隐藏设入口与禁用删除
	isEntry,
	// busy 表示写操作进行中
	busy,
	// chapterId 是当前章 id，用于回调参数
	chapterId,
	// onSetEntry 设为入口章，用于组件入参
	onSetEntry,
	// onDelete 删除章，用于组件入参
	onDelete,
}: ActionsProps) {
	return (
		<div className={styles.itemActions}>
			{/* 引用了Button组件，用于进入章编辑器 */}
			<Button
				component={Link}
				href={editorHref}
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
						void onSetEntry(chapterId);
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
					void onDelete(chapterId);
				}}
			>
				删除
			</Button>
		</div>
	);
}
