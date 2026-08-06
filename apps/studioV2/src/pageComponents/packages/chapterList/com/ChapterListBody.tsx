/**
	* 包内章列表主体：章行列表。
	*/
"use client";

import type { FC } from "react";
import type { DiskChapterSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
// 引用了ChapterListRow组件，用于渲染单章行
import { ChapterListRow } from "./ChapterListRow";
import styles from "../ChapterListView.module.scss";

type Props = {
	packageId: string;
	entryChapterId: string;
	chapters: readonly DiskChapterSummary[];
	busy: boolean;
	onSetEntry: (chapterId: string) => void;
	onDelete: (chapterId: string) => void;
};

export const ChapterListBody: FC<Props> = function (props) {
	const {
		packageId,
		entryChapterId,
		chapters,
		busy,
		onSetEntry,
		onDelete,
	} = props;

	return (
		<>
			<section className={styles.section}>
				<ul className={styles.list}>
					{chapters.map(function (ch) {
						return (
							// 引用了ChapterListRow组件，用于渲染单章行
							<ChapterListRow
								key={ch.chapterId}
								packageId={packageId}
								chapter={ch}
								isEntry={ch.chapterId === entryChapterId}
								busy={busy}
								onSetEntry={onSetEntry}
								onDelete={onDelete}
							/>
						);
					})}
				</ul>
			</section>

		</>
	);
};
